import { describe, expect, it, vi } from "vitest";

import RendererGraphics from "../renderer.graphics";
import type PDFDocument from "../pdf-document";

describe("Renderer", () => {
	const vectorDocument = () => ({
		lineWidth: vi.fn().mockReturnThis(),
		undash: vi.fn().mockReturnThis(),
		dash: vi.fn().mockReturnThis(),
		lineJoin: vi.fn().mockReturnThis(),
		lineCap: vi.fn().mockReturnThis(),
		moveTo: vi.fn().mockReturnThis(),
		lineTo: vi.fn().mockReturnThis(),
		rect: vi.fn().mockReturnThis(),
		providePattern: vi.fn(() => null),
		resolveColor: vi.fn((color: unknown) => color),
		strokeColor: vi.fn().mockReturnThis(),
		stroke: vi.fn().mockReturnThis(),
	});

	it("places a single linear-gradient stop at the start", () => {
		const stop = vi.fn();
		const gradient = { stop };
		const document = {
			lineWidth: vi.fn().mockReturnThis(),
			undash: vi.fn().mockReturnThis(),
			lineJoin: vi.fn().mockReturnThis(),
			lineCap: vi.fn().mockReturnThis(),
			rect: vi.fn().mockReturnThis(),
			linearGradient: vi.fn(() => gradient),
			providePattern: vi.fn(() => null),
			resolveColor: vi.fn((color: unknown) => color),
			fillColor: vi.fn().mockReturnThis(),
			fill: vi.fn().mockReturnThis(),
		};
		const renderer = new RendererGraphics(document as unknown as PDFDocument);

		renderer.renderVector({
			type: "rect",
			x: 0,
			y: 0,
			w: 10,
			h: 10,
			linearGradient: ["red"],
		});

		expect(stop).toHaveBeenCalledOnce();
		expect(stop).toHaveBeenCalledWith(0, "red");
	});

	it("does not emit unchanged vector graphics state repeatedly", () => {
		const document = vectorDocument();
		const renderer = new RendererGraphics(document as unknown as PDFDocument);
		const vector = { type: "rect" as const, x: 0, y: 0, w: 10, h: 10 };

		renderer.renderVector(vector);
		renderer.renderVector(vector);

		expect(document.lineWidth).toHaveBeenCalledOnce();
		expect(document.undash).toHaveBeenCalledOnce();
		expect(document.lineJoin).toHaveBeenCalledOnce();
		expect(document.lineCap).toHaveBeenCalledOnce();
		expect(document.rect).toHaveBeenCalledTimes(2);
	});

	it("uses the public lineOpacity value for vector strokes", () => {
		const document = vectorDocument();
		const renderer = new RendererGraphics(document as unknown as PDFDocument);

		renderer.renderVector({
			type: "line",
			x1: 0,
			y1: 0,
			x2: 10,
			y2: 10,
			lineColor: "black",
			lineOpacity: 0.25,
		});

		expect(document.strokeColor).toHaveBeenCalledWith("black", 0.25);
	});

	it("uses balanced PDFKit clipping operations", () => {
		const document = {
			save: vi.fn().mockReturnThis(),
			rect: vi.fn().mockReturnThis(),
			clip: vi.fn().mockReturnThis(),
			restore: vi.fn().mockReturnThis(),
		};
		const renderer = new RendererGraphics(document as unknown as PDFDocument);

		renderer.beginClip({ x: 1, y: 2, width: 3, height: 4 });
		renderer.endClip();

		expect(document.save).toHaveBeenCalledOnce();
		expect(document.rect).toHaveBeenCalledWith(1, 2, 3, 4);
		expect(document.clip).toHaveBeenCalledOnce();
		expect(document.restore).toHaveBeenCalledOnce();
		expect(() => renderer.endClip()).toThrow(/no clip region is active/);
	});

	it("rejects invalid clip rectangles before changing PDF state", () => {
		const document = { save: vi.fn() };
		const renderer = new RendererGraphics(document as unknown as PDFDocument);

		expect(() => renderer.beginClip({ x: 0, y: 0, width: -1, height: 4 })).toThrow(
			/Clip rectangle/,
		);
		expect(document.save).not.toHaveBeenCalled();
	});
});
