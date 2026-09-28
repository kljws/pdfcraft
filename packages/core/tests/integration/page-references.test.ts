import { beforeEach, describe, expect, it, vi } from "vitest";
import Renderer from "../../src/rendering/renderer.ts";
import type { RenderablePage } from "../../src/rendering/renderer.types.ts";
import { createReferenceInstance } from "../reference/reference-render.ts";
import type { DocumentDefinition } from "../../src/types/index.ts";

interface RenderedInline {
	text: string;
	x: number;
	width: number;
}

async function renderLines(definition: Record<string, unknown>): Promise<RenderedInline[][]> {
	const original = Renderer.prototype.renderPages;
	let lines: RenderedInline[][] = [];
	vi.spyOn(Renderer.prototype, "renderPages").mockImplementation(function (
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
	await createReferenceInstance()
		.createPdf(definition as unknown as DocumentDefinition)
		.getBuffer();
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
});
