import { beforeEach, describe, expect, it, vi } from "vitest";
import Renderer from "../../../rendering/renderer.ts";
import type { RenderablePage } from "../../../rendering/renderer.types.ts";
import {
	createReferenceInstance,
	extractPdfText,
	renderReference,
} from "../../../__tests__/fixtures/reference-render.ts";
import type { DocumentDefinition } from "../../../types/index.ts";

type RenderedInline = {
	text: string;
	x: number;
	width: number;
};

async function renderLines(definition: Record<string, unknown>): Promise<RenderedInline[][]> {
	const original = Renderer.prototype.renderPages;
	let lines: RenderedInline[][] = [];
	const spy = vi.spyOn(Renderer.prototype, "renderPages").mockImplementation(function (
		this: Renderer,
		pages: RenderablePage[],
	) {
		original.call(this, pages);
		lines = pages.flatMap((page) =>
			page.items
				.filter((entry) => entry.type === "line")
				.map((entry) =>
					((entry.item as { inlines: RenderedInline[] }).inlines ?? []).map(
						({ text, x, width }) => ({
							text,
							x,
							width,
						}),
					),
				),
		);
	});
	try {
		await createReferenceInstance()
			.createPdf(definition as unknown as DocumentDefinition)
			.getBuffer();
	} finally {
		spy.mockRestore();
	}
	return lines;
}

const filler = (lines: number) => Array.from({ length: lines }, (_, index) => `filler ${index}`);

describe("page references", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	for (const [description, fillerLines, expectedPage] of [
		["a one-digit page", 0, 1],
		["a two-digit page", 700, 2],
		["a three-digit page", 5500, 3],
	] as const) {
		it(`places following text directly after ${description}`, async () => {
			const lines = await renderLines({
				content: [
					{ text: ["See page ", { pageReference: "target" }, " for details"] },
					...filler(fillerLines),
					{ text: "Target", id: "target" },
				],
			});
			const inlines = lines[0];
			const reference = inlines.findIndex((inline) => /^\d+$/.test(inline.text));
			expect(inlines[reference]?.text).toHaveLength(expectedPage);
			expect(reference, JSON.stringify(inlines)).toBeGreaterThan(0);
			const next = inlines[reference + 1];
			expect(next.x).toBeCloseTo(inlines[reference].x + inlines[reference].width, 3);
		}, 60_000);
	}

	it("keeps a right-aligned reference inside its cell", async () => {
		const lines = await renderLines({
			content: [
				{
					table: {
						widths: ["*", 60],
						body: {
							groups: [{ rows: [["Chapter", { pageReference: "target", alignment: "right" }]] }],
						},
					},
				},
				...filler(60 * 12),
				{ text: "Target", id: "target" },
			],
		});
		const reference = lines.flat().find((inline) => /^\d{2}$/.test(inline.text));
		expect(reference).toBeDefined();
		expect(reference!.x + reference!.width).toBeLessThanOrEqual(60 + 1e-6);
	}, 60_000);

	describe("on lines after the first", () => {
		const target = [
			...Array.from({ length: 700 }, () => "filler"),
			{ text: "Target", id: "target" },
		];

		/** Renders the content and returns every referenced number and the target's page. */
		async function render(content: unknown[]) {
			const { layout } = await renderReference({ content: [...content, ...target] });
			const texts = layout.map((page) =>
				page.items.map((item) => (item as { text?: string }).text ?? ""),
			);
			const targetPage = String(texts.findIndex((page) => page.includes("Target")) + 1);
			const numbers = texts
				.flat()
				.flatMap((text) => [...text.matchAll(/ref(\d+)/g)].map((m) => m[1]));
			return { numbers, targetPage };
		}

		it("resolves a reference after an explicit newline", async () => {
			const { numbers, targetPage } = await render([
				{ text: ["first line\nref", { pageReference: "target" }] },
			]);
			expect(targetPage).not.toBe("1");
			expect(numbers).toEqual([targetPage]);
		}, 60_000);

		it("resolves references on wrapped lines", async () => {
			const words = Array.from({ length: 40 }, () => "word").join(" ");
			const { numbers, targetPage } = await render([
				{
					text: [
						words,
						" ref",
						{ pageReference: "target" },
						" ",
						words,
						" ref",
						{ pageReference: "target" },
					],
				},
			]);
			expect(numbers).toEqual([targetPage, targetPage]);
		}, 60_000);

		it("resolves references on lines rebuilt after a column transition", async () => {
			const fragments = Array.from({ length: 150 }, () => [
				"line ref",
				{ pageReference: "target" },
				"\n",
			]).flat();
			const { numbers, targetPage } = await render([
				// The first line has no reference, so only later and rebuilt lines carry one.
				{
					columns: [
						{ text: ["intro\n", ...fragments], width: "*" },
						{ text: "", width: "*" },
					],
					snakingColumns: true,
				},
			]);
			expect(numbers).toEqual(Array.from({ length: 150 }, () => targetPage));
		}, 60_000);
	});

	describe("split across lines", () => {
		const target = [
			...Array.from({ length: 700 }, () => "filler"),
			{ text: "Target", id: "target" },
		];

		/** Renders the content; returns the PDF text of the first page and the target's page. */
		async function render(content: unknown[]) {
			const { layout, pdf } = await renderReference({ content: [...content, ...target] });
			const targetPage = layout.findIndex((page) =>
				page.items.some((item) => (item as { text?: string }).text === "Target"),
			);
			const firstPage = (await extractPdfText(pdf))[0];
			return { firstPage: firstPage.replace(/\s+/g, ""), targetPage: String(targetPage + 1) };
		}

		for (const [name, column] of [
			["a column too narrow for the number", { width: 4, text: [{ pageReference: "target" }] }],
			[
				"break-all wrapping",
				{ width: 30, wordBreak: "break-all", text: ["p ", { pageReference: "target" }] },
			],
			["a standalone reference node", { width: 4, stack: [{ pageReference: "target" }] }],
		] as const) {
			it(`renders a two-digit page number split by ${name} exactly once`, async () => {
				const { firstPage, targetPage } = await render([{ columns: [column, "|end"] }]);
				expect(targetPage).toHaveLength(2);
				expect(
					firstPage.startsWith(
						`${"p".repeat(name === "break-all wrapping" ? 1 : 0)}${targetPage}|end`,
					),
				).toBe(true);
			}, 60_000);
		}

		it("renders a split number across a snaking column transition", async () => {
			const fragments = Array.from({ length: 150 }, () => [
				"x",
				{ pageReference: "target" },
				"\n",
			]).flat();
			const { firstPage, targetPage } = await render([
				{
					columns: [
						{ width: 12, text: ["intro\n", ...fragments] },
						{ width: 12, text: "" },
					],
					snakingColumns: true,
				},
			]);
			expect(targetPage).toHaveLength(2);
			expect(firstPage).not.toContain("00000");
			expect(firstPage.match(new RegExp(`x${targetPage}`, "g"))?.length).toBeGreaterThan(0);
			expect(firstPage).not.toMatch(new RegExp(`x${targetPage}${targetPage}`));
		}, 60_000);
	});
});
