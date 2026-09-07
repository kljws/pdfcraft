import { describe, expect, it, vi } from "vitest";
import Renderer from "../renderer";
import type PDFDocument from "../pdf-document";
import type { Inline, LineLike, PdfFont } from "../../types/internal";

const font: PdfFont = {
	ascender: 800,
	descender: -200,
	lineHeight: (size) => size,
	widthOfString: (text, size) => text.length * size,
};

describe("Renderer text lines", () => {
	it("renders inline images at their measured position and dimensions", () => {
		const document = {
			outline: { addItem: vi.fn() },
			opacity: vi.fn().mockReturnThis(),
			fill: vi.fn().mockReturnThis(),
			resolveColor: vi.fn((color: unknown) => color),
			fontSize: vi.fn().mockReturnThis(),
			image: vi.fn().mockReturnThis(),
			text: vi.fn().mockReturnThis(),
		} as unknown as PDFDocument;
		const inline = {
			text: "",
			image: "icon",
			_imageWidth: 24,
			_imageHeight: 16,
			width: 24,
			height: 16,
			x: 30,
			leadingCut: 0,
			trailingCut: 0,
			font,
			fontSize: 12,
		} as Inline;
		const line = {
			inlines: [inline],
			getHeight: () => 16,
			getAscenderHeight: () => 16,
			getWidth: () => 24,
		} as LineLike;

		new Renderer(document).renderLine(line, 10, 20);

		expect(document.image).toHaveBeenCalledWith("icon", 40, 20, {
			width: 24,
			height: 16,
		});
		expect(document.text).not.toHaveBeenCalled();
	});

	it("renders inline AcroForm fields and initializes the form once", () => {
		const document = {
			outline: { addItem: vi.fn() },
			resolveColor: vi.fn((color: unknown) => color),
			initForm: vi.fn().mockReturnThis(),
			formCheckbox: vi.fn().mockReturnThis(),
		} as unknown as PDFDocument;
		const inline = {
			text: "",
			acroform: { type: "checkbox", id: "terms", options: { selected: true } },
			width: 14,
			height: 14,
			x: 30,
			leadingCut: 0,
			trailingCut: 0,
			font,
			fontSize: 12,
		} as Inline;
		const line = {
			inlines: [inline],
			getHeight: () => 16,
			getAscenderHeight: () => 14,
			getWidth: () => 14,
		} as LineLike;
		const renderer = new Renderer(document);

		renderer.renderLine(line, 10, 20);
		renderer.renderLine(line, 10, 40);

		expect(document.initForm).toHaveBeenCalledOnce();
		expect(document.formCheckbox).toHaveBeenNthCalledWith(1, "terms", 40, 22, 14, 14, {
			selected: true,
		});
	});

	it("includes AcroForm choice labels in embedded font subsets", () => {
		const encode = vi.fn();
		const document = {
			outline: { addItem: vi.fn() },
			resolveColor: vi.fn((color: unknown) => color),
			initForm: vi.fn().mockReturnThis(),
			formCombo: vi.fn().mockReturnThis(),
		} as unknown as PDFDocument;
		const inline = {
			text: "",
			acroform: {
				type: "combo",
				id: "role",
				options: {
					select: ["Developer", "Designer", "Reviewer"],
					defaultValue: "Developer",
				},
			},
			width: 100,
			height: 20,
			x: 0,
			leadingCut: 0,
			trailingCut: 0,
			font: { ...font, encode },
			fontSize: 12,
		} as Inline;
		const line = {
			inlines: [inline],
			getHeight: () => 20,
			getAscenderHeight: () => 20,
			getWidth: () => 100,
		} as LineLike;

		new Renderer(document).renderLine(line, 10, 20);

		expect(encode.mock.calls.map(([value]) => value)).toEqual([
			"Developer",
			"Developer",
			"Designer",
			"Reviewer",
		]);
	});
});
