import { beforeEach, describe, expect, it, vi } from "vitest";

const svgToPdf = vi.hoisted(() => vi.fn());
vi.mock("svg-to-pdfkit", () => ({ default: svgToPdf }));

import type { LayoutPdfNode, Vector } from "../../types/internal";
import type PDFDocument from "../pdf-document";
import Renderer from "../renderer";
import RendererGraphics from "../renderer.graphics";

const createDocument = () => {
	const action = { end: vi.fn() };
	const document = {
		fonts: { Roboto: { normal: "regular.ttf", bold: "bold.ttf" } },
		page: { width: 600, height: 800 },
		_font: null as unknown,
		lineWidth: vi.fn().mockReturnThis(),
		dash: vi.fn().mockReturnThis(),
		undash: vi.fn().mockReturnThis(),
		lineJoin: vi.fn().mockReturnThis(),
		lineCap: vi.fn().mockReturnThis(),
		ellipse: vi.fn().mockReturnThis(),
		roundedRect: vi.fn().mockReturnThis(),
		rect: vi.fn().mockReturnThis(),
		moveTo: vi.fn().mockReturnThis(),
		lineTo: vi.fn().mockReturnThis(),
		closePath: vi.fn().mockReturnThis(),
		path: vi.fn().mockReturnThis(),
		linearGradient: vi.fn(),
		providePattern: vi.fn((_color: unknown): unknown => null),
		resolveColor: vi.fn((color: unknown, fallback: unknown) => color ?? fallback),
		fillColor: vi.fn().mockReturnThis(),
		strokeColor: vi.fn().mockReturnThis(),
		fillAndStroke: vi.fn().mockReturnThis(),
		fill: vi.fn().mockReturnThis(),
		stroke: vi.fn().mockReturnThis(),
		opacity: vi.fn().mockReturnThis(),
		save: vi.fn().mockReturnThis(),
		clip: vi.fn().mockReturnThis(),
		restore: vi.fn().mockReturnThis(),
		image: vi.fn().mockReturnThis(),
		link: vi.fn().mockReturnThis(),
		ref: vi.fn(() => action),
		annotate: vi.fn().mockReturnThis(),
		goTo: vi.fn().mockReturnThis(),
		provideAttachment: vi.fn(() => ({ src: "attachment.txt" })),
		fileAnnotation: vi.fn().mockReturnThis(),
		getFontFile: vi.fn((): string | null => "regular.ttf"),
		getFontType: vi.fn(() => "normal"),
		translate: vi.fn().mockReturnThis(),
		rotate: vi.fn().mockReturnThis(),
		fontSize: vi.fn().mockReturnThis(),
		text: vi.fn().mockReturnThis(),
	};
	return { document, action };
};

describe("Renderer graphics", () => {
	beforeEach(() => svgToPdf.mockReset());

	it("renders every vector path and paint combination", () => {
		const { document } = createDocument();
		const gradient = { stop: vi.fn() };
		document.linearGradient.mockReturnValue(gradient);
		const renderer = new RendererGraphics(document as unknown as PDFDocument);

		renderer.renderVector({
			type: "rect",
			x: 1,
			y: 2,
			w: 30,
			h: 40,
			r: 3,
			lineWidth: 2,
			dash: { length: 4, space: 6, phase: 2 },
			lineJoin: "round",
			lineCap: "square",
			color: "red",
			lineColor: "blue",
			fillOpacity: 0.4,
			strokeOpacity: 0.6,
		});
		renderer.renderVector({
			type: "ellipse",
			x: 20,
			y: 30,
			r1: 10,
			r2: 5,
			linearGradient: ["red", "blue", "green"],
		});
		renderer.renderVector({
			type: "polyline",
			points: [
				{ x: 0, y: 0 },
				{ x: 10, y: 10 },
			],
			closePath: true,
			color: "green",
		});
		renderer.renderVector({ type: "polyline", points: [] });
		renderer.renderVector({ type: "path", d: "M0 0L5 5", lineColor: "black" });

		expect(document.roundedRect).toHaveBeenCalledWith(1, 2, 30, 40, 3);
		expect(document.dash).toHaveBeenCalledWith(4, { space: 6, phase: 2 });
		expect(document.fillColor).toHaveBeenCalledWith("red", 0.4);
		expect(document.strokeColor).toHaveBeenCalledWith("blue", 0.6);
		expect(document.fillAndStroke).toHaveBeenCalledOnce();
		expect(document.ellipse).toHaveBeenCalledWith(20, 30, 10, 5);
		expect(gradient.stop.mock.calls).toEqual([
			[0, "red"],
			[0.5, "blue"],
			[1, "green"],
		]);
		expect(document.closePath).toHaveBeenCalledOnce();
		expect(document.path).toHaveBeenCalledWith("M0 0L5 5");
		expect(document.fill).toHaveBeenCalledTimes(2);
		expect(document.stroke).toHaveBeenCalledTimes(2);
	});

	it("uses pattern colors and closes already closed polylines", () => {
		const { document } = createDocument();
		const pattern = ["pattern", "red"];
		document.providePattern.mockReturnValue(pattern);
		const renderer = new RendererGraphics(document as unknown as PDFDocument);
		const vector: Vector = {
			type: "polyline",
			points: [
				{ x: 1, y: 1 },
				{ x: 2, y: 2 },
				{ x: 1, y: 1 },
			],
			color: ["pattern", "red"],
		};

		renderer.renderVector(vector);

		expect(vector.color).toBe(pattern);
		expect(document.closePath).toHaveBeenCalledOnce();
		expect(document.fillColor).toHaveBeenCalledWith(pattern, 1);
	});

	it("applies the layout offset to canvas paths (#1290)", () => {
		const { document } = createDocument();
		const renderer = new RendererGraphics(document as unknown as PDFDocument);

		renderer.renderVector({
			type: "path",
			d: "M 10 10 L 210 10",
			x: 40,
			y: 50,
			lineColor: "blue",
		});

		expect(document.save).toHaveBeenCalledOnce();
		expect(document.translate).toHaveBeenCalledWith(40, 50);
		expect(document.path).toHaveBeenCalledWith("M 10 10 L 210 10");
		expect(document.restore).toHaveBeenCalledOnce();
	});

	it("renders covered images and all supported annotations", () => {
		const { document, action } = createDocument();
		const renderer = new RendererGraphics(document as unknown as PDFDocument);
		const image = {
			image: "image",
			x: 10,
			y: 20,
			_width: 100,
			_height: 50,
			cover: { width: 100, height: 50, align: "left", valign: "top" },
			opacity: 0.5,
			link: "https://example.com",
			linkToPage: 2,
			linkToDestination: "chapter",
			linkToFile: "attachment",
		} as LayoutPdfNode;

		renderer.renderImage(image);

		expect(document.opacity).toHaveBeenCalledWith(0.5);
		expect(document.rect).toHaveBeenCalledWith(10, 20, 100, 50);
		expect(document.clip).toHaveBeenCalledOnce();
		expect(document.image).toHaveBeenCalledWith("image", 10, 20, {
			cover: [100, 50],
			align: undefined,
			valign: undefined,
		});
		expect(document.link).toHaveBeenCalledWith(10, 20, 100, 50, "https://example.com");
		expect(action.end).toHaveBeenCalledOnce();
		expect(document.annotate).toHaveBeenCalledWith(10, 20, 100, 50, {
			Subtype: "Link",
			Dest: [1, "XYZ", null, null, null],
		});
		expect(document.goTo).toHaveBeenCalledWith(10, 20, 100, 50, "chapter");
		expect(document.fileAnnotation).toHaveBeenCalledWith(
			10,
			20,
			100,
			50,
			{ src: "attachment.txt" },
			expect.objectContaining({ AP: expect.any(Object) }),
		);
	});

	it("renders normally sized images without clipping", () => {
		const { document } = createDocument();
		const renderer = new RendererGraphics(document as unknown as PDFDocument);

		renderer.renderImage({ image: "image", x: 1, y: 2, _width: 3, _height: 4 } as LayoutPdfNode);

		expect(document.image).toHaveBeenCalledWith("image", 1, 2, { width: 3, height: 4 });
		expect(document.save).not.toHaveBeenCalled();
	});

	it("clips image corners and draws the border inside its layout box", () => {
		const { document } = createDocument();
		const renderer = new RendererGraphics(document as unknown as PDFDocument);

		renderer.renderImage({
			image: "image",
			x: 10,
			y: 20,
			_width: 100,
			_height: 50,
			borderRadius: 12,
			borderWidth: 2,
			_imageBorderColor: "red",
		} as LayoutPdfNode);

		expect(document.save).toHaveBeenCalledOnce();
		expect(document.roundedRect).toHaveBeenNthCalledWith(1, 10, 20, 100, 50, 12);
		expect(document.clip).toHaveBeenCalledOnce();
		expect(document.image).toHaveBeenCalledWith("image", 10, 20, { width: 100, height: 50 });
		expect(document.restore).toHaveBeenCalledOnce();
		expect(document.lineWidth).toHaveBeenCalledWith(2);
		expect(document.strokeColor).toHaveBeenCalledWith("red");
		expect(document.roundedRect).toHaveBeenNthCalledWith(2, 11, 21, 98, 48, 11);
		expect(document.stroke).toHaveBeenCalledOnce();
	});

	it("clips covered images with a radius bounded by their dimensions", () => {
		const { document } = createDocument();
		const renderer = new RendererGraphics(document as unknown as PDFDocument);

		renderer.renderImage({
			image: "image",
			x: 5,
			y: 6,
			_width: 100,
			_height: 40,
			cover: { width: 100, height: 40 },
			borderRadius: 50,
		} as LayoutPdfNode);

		expect(document.roundedRect).toHaveBeenCalledWith(5, 6, 100, 40, 20);
		expect(document.clip).toHaveBeenCalledOnce();
		expect(document.image).toHaveBeenCalledWith("image", 5, 6, {
			cover: [100, 40],
			align: undefined,
			valign: undefined,
		});
		expect(document.restore).toHaveBeenCalledOnce();
	});

	it("passes SVG options, resolves fonts and renders links", () => {
		const { document, action } = createDocument();
		const renderer = new RendererGraphics(document as unknown as PDFDocument);
		const svg = {
			svg: "<svg/>",
			x: 5,
			y: 6,
			_width: 70,
			_height: 80,
			font: "Roboto",
			options: { preserveAspectRatio: "none" },
			link: "https://example.com/svg",
			linkToPage: 3,
			linkToDestination: "svg-target",
		} as LayoutPdfNode;

		renderer.renderSVG(svg);

		const options = svgToPdf.mock.calls[0][4];
		expect(options).toMatchObject({
			width: 70,
			height: 80,
			assumePt: true,
			useCSS: false,
			preserveAspectRatio: "none",
		});
		expect(options.fontCallback("'Missing', Roboto", false, false)).toBe("regular.ttf");
		expect(document.link).toHaveBeenCalledWith(5, 6, 70, 80, "https://example.com/svg");
		expect(action.end).toHaveBeenCalledOnce();
		expect(document.annotate).toHaveBeenCalledWith(5, 6, 70, 80, {
			Subtype: "Link",
			Dest: [2, "XYZ", null, null, null],
		});
		expect(document.goTo).toHaveBeenCalledWith(5, 6, 70, 80, "svg-target");
	});

	it("reports a missing SVG font style", () => {
		const { document } = createDocument();
		document.getFontFile.mockReturnValue(null);
		const renderer = new RendererGraphics(document as unknown as PDFDocument);
		renderer.renderSVG({ svg: "<svg/>", x: 0, y: 0, _width: 10, _height: 10 } as LayoutPdfNode);
		const options = svgToPdf.mock.calls[0][4];

		expect(() => options.fontCallback("Roboto", true, false)).toThrow(
			"Font 'Roboto' in style 'normal' is not defined",
		);
	});

	it("renders attachment icons, vertical alignment and watermarks", () => {
		const { document } = createDocument();
		const renderer = new RendererGraphics(document as unknown as PDFDocument);
		const middle = {
			isCellContentMultiPage: false,
			verticalAlignment: "middle" as const,
			getNodeHeight: () => 100,
			getViewHeight: () => 40,
		};
		const bottom = { ...middle, verticalAlignment: "bottom" as const };
		const multipage = { ...middle, isCellContentMultiPage: true };

		renderer.renderAttachment({
			attachment: "attachment",
			icon: "Paperclip",
			x: 1,
			y: 2,
			_width: 3,
			_height: 4,
		} as LayoutPdfNode);
		renderer.beginVerticalAlignment(middle);
		renderer.endVerticalAlignment(middle);
		renderer.beginVerticalAlignment(bottom);
		renderer.endVerticalAlignment(bottom);
		renderer.beginVerticalAlignment(multipage);
		renderer.endVerticalAlignment(multipage);
		renderer.renderWatermark({
			items: [],
			pageSize: { width: 600, height: 800, orientation: "portrait" },
			pageMargins: { left: 0, top: 0, right: 0, bottom: 0 },
			customProperties: {},
			watermark: {
				text: "DRAFT",
				font: { name: "font" },
				fontSize: 40,
				color: "gray",
				opacity: 0.25,
				bold: false,
				italics: false,
				angle: -45,
				_size: {
					size: { width: 120, height: 40 },
					rotatedSize: { width: 120, height: 120 },
				},
			},
		});

		expect(document.fileAnnotation).toHaveBeenCalledWith(
			1,
			2,
			3,
			4,
			{ src: "attachment.txt" },
			{ Name: "Paperclip" },
		);
		expect(document.translate.mock.calls).toEqual([
			[0, -30],
			[0, -60],
		]);
		expect(document.rotate).toHaveBeenCalledWith(-45, { origin: [300, 400] });
		expect(document.fontSize).toHaveBeenCalledWith(40);
		expect(document.text).toHaveBeenCalledWith("DRAFT", 240, 380, { lineBreak: false });
	});

	it("detects clipping left open at the end of a page", () => {
		const { document } = createDocument();
		Object.assign(document, { addPage: vi.fn().mockReturnThis(), _pdfCraftPages: [] });
		const renderer = new Renderer(document as unknown as PDFDocument);

		expect(() =>
			renderer.renderPages([
				{
					items: [{ type: "beginClip", item: { x: 0, y: 0, width: 10, height: 10 } }],
					pageSize: { width: 100, height: 100, orientation: "portrait" },
					pageMargins: { left: 0, top: 0, right: 0, bottom: 0 },
					customProperties: {},
				},
			]),
		).toThrow("Unbalanced clipping operations: 1 clip region(s) not closed");
	});
});
