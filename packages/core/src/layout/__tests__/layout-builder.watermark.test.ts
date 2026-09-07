import { describe, expect, it, vi } from "vitest";

import type PDFDocument from "../../rendering/pdf-document";
import { createWatermark } from "../layout-builder.watermark";

const createDocument = () => {
	const font = {
		ascender: 800,
		descender: -200,
		lineHeight: (size: number) => size,
		widthOfString: (text: string, size: number) => text.length * size * 0.5,
	};
	return { provideFont: vi.fn(() => font) } as unknown as PDFDocument;
};

describe("createWatermark", () => {
	it("applies the default font and diagonal angle", () => {
		const document = createDocument();
		const result = createWatermark(
			{ text: "Draft", fontSize: 24 },
			{ width: 200, height: 300, orientation: "portrait" },
			document,
			{ font: "Inter" },
		);

		expect(document.provideFont).toHaveBeenCalledWith("Inter", false, false);
		expect(result.angle).toBeCloseTo(-56.31, 2);
		expect(result.opacity).toBe(0.6);
	});

	it("preserves an explicit zero angle and opacity", () => {
		const result = createWatermark(
			{ text: "Draft", fontSize: 20, angle: 0, opacity: 0 },
			{ width: 200, height: 300, orientation: "portrait" },
			createDocument(),
			{},
		);

		expect(result.angle).toBe(0);
		expect(result.opacity).toBe(0);
	});

	it("fits an automatic font size inside the page", () => {
		const result = createWatermark(
			{ text: "DRAFT", angle: 0 },
			{ width: 100, height: 50, orientation: "landscape" },
			createDocument(),
			{},
		);

		expect(result.fontSize).toBeGreaterThan(39);
		expect(result.fontSize).toBeLessThanOrEqual(40);
		expect(result._size.rotatedSize.width).toBeLessThanOrEqual(100);
	});
});
