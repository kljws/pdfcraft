import { describe, expect, it, vi } from "vitest";

import TextDecorator from "../text-decorator";
import type PDFDocument from "../../rendering/pdf-document";
import type { Inline, LineLike } from "../../types/internal";

const createDocument = () => ({
	resolveColor: vi.fn(() => "black"),
	providePattern: vi.fn(() => null),
	save: vi.fn().mockReturnThis(),
	restore: vi.fn().mockReturnThis(),
	fillColor: vi.fn().mockReturnThis(),
	rect: vi.fn().mockReturnThis(),
	fill: vi.fn().mockReturnThis(),
	clip: vi.fn().mockReturnThis(),
	lineWidth: vi.fn().mockReturnThis(),
	moveTo: vi.fn().mockReturnThis(),
	bezierCurveTo: vi.fn().mockReturnThis(),
	stroke: vi.fn().mockReturnThis(),
});

const createInline = (decorationThickness: number, decorationStyle = "solid"): Inline =>
	({
		text: "x",
		x: 0,
		width: 10,
		height: 12,
		fontSize: 12,
		font: { ascender: 800 },
		decoration: "underline",
		decorationThickness,
		decorationStyle,
	}) as Inline;

const createLine = (inlines: Inline[]): LineLike =>
	({
		inlines,
		getHeight: () => 12,
		getAscenderHeight: () => 10,
	}) as LineLike;

describe("TextDecorator", () => {
	it("keeps adjacent decorations with different thicknesses separate", () => {
		const document = createDocument();
		const decorator = new TextDecorator(document as unknown as PDFDocument);

		decorator.drawDecorations(createLine([createInline(1), createInline(2)]), 0, 0);

		expect(document.rect).toHaveBeenCalledTimes(2);
	});

	it("clips a wavy decoration using its actual height", () => {
		const document = createDocument();
		const decorator = new TextDecorator(document as unknown as PDFDocument);

		decorator.drawDecorations(createLine([createInline(1, "wavy")]), 0, 100);

		expect(document.rect).toHaveBeenCalledWith(0, expect.any(Number), 10, 2);
	});
});
