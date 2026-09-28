import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { SAMPLE_IMAGE } from "../reference/reference-documents.ts";
import { extractPdfText, renderReference } from "../reference/reference-render.ts";

const kinds = (layout: Awaited<ReturnType<typeof renderReference>>["layout"]) =>
	layout.map((page) =>
		(page.items as Array<{ kind: string; text?: string }>).map(
			(item) => item.kind + (item.text ?? ""),
		),
	);

describe("oversized atomic content", () => {
	let warn: MockInstance<typeof console.warn>;
	beforeEach(() => {
		warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	});
	const imageWarnings = () =>
		warn.mock.calls
			.map((call) => String(call[0]))
			.filter((message) => message.startsWith("Image "));

	it("keeps an image taller than the page when the page has a background", async () => {
		const content = ["before", { image: SAMPLE_IMAGE, width: 500, height: 900 }, "after"];
		const plain = await renderReference({ content });
		const withBackground = await renderReference({ background: { text: "bg" }, content });

		expect(kinds(plain.layout)).toEqual([["linebefore"], ["image"], ["lineafter"]]);
		expect(kinds(withBackground.layout)).toEqual([
			["linebg", "linebefore"],
			["linebg", "image"],
			["linebg", "lineafter"],
		]);
		expect(await extractPdfText(withBackground.pdf)).toHaveLength(3);
	});

	it("keeps a canvas taller than the page when the page has a background", async () => {
		const { layout } = await renderReference({
			background: { text: "bg" },
			content: ["before", { canvas: [{ type: "rect", x: 0, y: 0, w: 50, h: 900 }] }, "after"],
		});
		expect(kinds(layout)).toEqual([
			["linebg", "linebefore"],
			["linebg", "vector"],
			["linebg", "lineafter"],
		]);
	});

	it("warns once with the image identity and size when it cannot fit on a fresh page", async () => {
		await renderReference({
			footer: (page: number, count: number) => `${page}/${count}`,
			content: ["before", { image: SAMPLE_IMAGE, width: 500, height: 900 }],
		});
		expect(imageWarnings()).toEqual([
			`Image ${SAMPLE_IMAGE} (500x900 pt) exceeds the available content area (515.28x761.89 pt) and will overflow.`,
		]);
	});

	it("does not warn when an image only moves to the next page", async () => {
		const { layout } = await renderReference({
			content: [{ text: "filler ".repeat(600) }, { image: SAMPLE_IMAGE, width: 300, height: 400 }],
		});
		expect(layout.at(-1)?.items).toContainEqual(expect.objectContaining({ kind: "image" }));
		expect(imageWarnings()).toEqual([]);
	});

	it("does not warn for an absolutely positioned image", async () => {
		await renderReference({
			content: [{ image: SAMPLE_IMAGE, width: 500, height: 900, absolutePosition: { x: 0, y: 0 } }],
		});
		expect(imageWarnings()).toEqual([]);
	});

	it("warns when an image is wider than its column", async () => {
		await renderReference({
			content: { columns: [{ width: 100, image: SAMPLE_IMAGE, fit: [150, 150] }, "text"] },
		});
		expect(imageWarnings()).toHaveLength(1);
		expect(imageWarnings()[0]).toMatch(/exceeds the available content area \(100x/);
	});
});

describe("image shrinkToFit", () => {
	const imageItems = (layout: Awaited<ReturnType<typeof renderReference>>["layout"]) =>
		layout.flatMap((page, pageIndex) =>
			(page.items as Array<Record<string, unknown>>)
				.filter((item) => item.kind === "image")
				.map((item) => ({ page: pageIndex, width: item._width, height: item._height })),
		);

	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it("scales an image taller than a fresh page to the page content area", async () => {
		const { layout } = await renderReference({
			content: ["before", { image: SAMPLE_IMAGE, width: 500, height: 1000, shrinkToFit: true }],
		});
		const [image] = imageItems(layout);
		expect(image.page).toBe(1);
		expect(image.height).toBeCloseTo(761.89, 1);
		expect(image.width).toBeCloseTo(500 * (761.89 / 1000), 1);
		expect(console.warn).not.toHaveBeenCalledWith(expect.stringMatching(/^Image /));
	});

	it("scales an image wider than its column proportionally", async () => {
		const { layout } = await renderReference({
			content: {
				columns: [
					{
						width: 100,
						stack: [{ image: SAMPLE_IMAGE, width: 200, height: 100, shrinkToFit: true }],
					},
					"x",
				],
			},
		});
		expect(imageItems(layout)).toEqual([{ page: 0, width: 100, height: 50 }]);
	});

	it("moves a fitting image to the next page instead of shrinking it", async () => {
		const { layout } = await renderReference({
			content: [
				{ text: "filler ".repeat(600) },
				{ image: SAMPLE_IMAGE, width: 300, height: 400, shrinkToFit: true },
			],
		});
		expect(imageItems(layout)).toEqual([{ page: 1, width: 300, height: 400 }]);
	});

	it("never enlarges an image and is off by default", async () => {
		const small = await renderReference({
			content: [{ image: SAMPLE_IMAGE, width: 50, height: 50, shrinkToFit: true }],
		});
		expect(imageItems(small.layout)).toEqual([{ page: 0, width: 50, height: 50 }]);

		const byDefault = await renderReference({
			content: ["before", { image: SAMPLE_IMAGE, width: 500, height: 1000 }],
		});
		expect(imageItems(byDefault.layout)).toEqual([{ page: 1, width: 500, height: 1000 }]);
	});
});

/**
 * Content that cannot be resized falls back to splitting when it is taller than a page: the
 * unbreakable or keep-together request is dropped for that block only, and nothing is lost.
 * An oversized header or footer is rejected instead (see header-footer tests).
 */
describe("oversized unbreakable content", () => {
	const words = (count: number, prefix: string): string =>
		Array.from({ length: count }, (_, index) => `${prefix}${index}`).join(" ");

	const cases: Record<string, { content: unknown; background?: unknown; expectedWords: number }> = {
		"unbreakable block": {
			content: ["before", { unbreakable: true, stack: [words(2000, "u")] }, "after"],
			expectedWords: 2000,
		},
		"unbreakable block on pages with a background": {
			background: { text: "bg" },
			content: ["before", { unbreakable: true, stack: [words(2000, "u")] }, "after"],
			expectedWords: 2000,
		},
		"unbreakable block inside columns": {
			content: [
				"before",
				{ columns: [{ unbreakable: true, stack: [words(2000, "u")] }, "x"] },
				"after",
			],
			expectedWords: 2000,
		},
		"table row in a dontBreakRows group": {
			content: [
				"before",
				{
					table: {
						widths: ["*"],
						body: { groups: [{ dontBreakRows: true, rows: [["r0"], [words(2000, "t")], ["r2"]] }] },
					},
				},
				"after",
			],
			expectedWords: 2000,
		},
		"keepTogether group": {
			content: [
				"before",
				{
					table: {
						widths: ["*"],
						body: {
							groups: [
								{
									keepTogether: true,
									rows: Array.from({ length: 120 }, (_, index) => [`k${index}`]),
								},
							],
						},
					},
				},
				"after",
			],
			expectedWords: 120,
		},
		"repeated table header": {
			content: [
				{
					table: {
						widths: ["*"],
						header: { rows: [[words(1200, "h")]] },
						body: { groups: [{ rows: Array.from({ length: 5 }, (_, index) => [`b${index}`]) }] },
					},
				},
				"after",
			],
			expectedWords: 1205,
		},
	};

	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	for (const [name, definition] of Object.entries(cases)) {
		it(`splits an oversized ${name} without losing content`, async () => {
			const { pdf, layout } = await renderReference(definition);
			const text = (await extractPdfText(pdf)).join(" ");
			const found = new Set(text.match(/\b[utkhb]\d+\b/g));
			expect(layout.length).toBeGreaterThan(1);
			expect(found.size).toBe(definition.expectedWords);
			expect(text).toContain("after");
		});
	}
});
