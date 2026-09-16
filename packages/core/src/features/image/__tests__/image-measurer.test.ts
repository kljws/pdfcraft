import { assert, describe, it } from "vitest";
import BaseDocPreprocessor from "../../../preprocessing/doc-preprocessor.ts";
import BaseDocMeasure from "../../../measurement/doc-measure.ts";
import type PDFDocument from "../../../rendering/pdf-document.ts";
import StyleContextStack from "../../../services/styles/style-context-stack.ts";
import type { PreprocessedPdfNode } from "../../../types/internal.ts";
import ImageMeasurer from "../image-measurer.ts";
import type { MeasuredImageNode } from "../image.types.ts";
import type { MeasuredTextNode } from "../../text/text.types.ts";

describe("Image measurement", function () {
	it("measures registered images embedded in text", function () {
		const measure = new BaseDocMeasure(
			{
				images: {},
				provideImage: () => ({ width: 40, height: 20, orientation: 0 }),
				provideFont: () => ({
					ascender: 0,
					descender: 0,
					widthOfString: (text: string, size: number) => text.length * size,
					lineHeight: (size: number) => size,
				}),
			} as unknown as PDFDocument,
			{},
			{},
		);
		const node = { text: ["before ", { image: "logo", width: 20 }, " after"] };
		new BaseDocPreprocessor().preprocessDocument(node);

		const result = measure.measureDocument(node as PreprocessedPdfNode) as MeasuredTextNode;
		const image = result.metrics.inlines.find((inline) => inline.image !== undefined)!;

		assert.equal(image.image, "logo");
		assert.equal(image.width, 20);
		assert.equal(image.height, 10);
	});

	it("registers Uint8Array images as inline image resources", function () {
		const images: Record<string, string | Uint8Array | ArrayBuffer> = {};
		const measurer = new ImageMeasurer(
			{ images } as unknown as PDFDocument,
			new StyleContextStack(),
		);
		const source = new Uint8Array([1, 2, 3]);
		const imageNode = { image: source } as MeasuredImageNode;

		measurer.convertIfInlineImage(imageNode);

		assert.equal(typeof imageNode.image, "string");
		assert.strictEqual(images[imageNode.image as string], source);
	});

	it("deduplicates repeated inline image resources", function () {
		const images: Record<string, string | Uint8Array | ArrayBuffer> = {};
		const measurer = new ImageMeasurer(
			{ images } as unknown as PDFDocument,
			new StyleContextStack(),
		);
		const bytes = new Uint8Array([1, 2, 3]);
		const dataUrl = "data:image/png;base64,AQID";
		const byteNodes = [{ image: bytes }, { image: bytes }] as MeasuredImageNode[];
		const dataUrlNodes = [{ image: dataUrl }, { image: dataUrl }] as MeasuredImageNode[];

		for (const node of [...byteNodes, ...dataUrlNodes]) measurer.convertIfInlineImage(node);

		assert.equal(byteNodes[0].image, byteNodes[1].image);
		assert.equal(dataUrlNodes[0].image, dataUrlNodes[1].image);
		assert.notEqual(byteNodes[0].image, dataUrlNodes[0].image);
		assert.equal(Object.keys(images).length, 2);
	});

	it("falls back to intrinsic dimensions for an invalid width", function () {
		const measurer = new ImageMeasurer(
			{ images: {} } as unknown as PDFDocument,
			new StyleContextStack(),
		);
		const result = measurer.measureImageWithDimensions(
			{ image: "...", width: "auto" } as MeasuredImageNode,
			{ width: 42, height: 42 },
		);

		assert.equal(result._width, 42);
		assert.equal(result._height, 42);
	});

	it("falls back to intrinsic dimensions for an unsupported percentage width", function () {
		const measurer = new ImageMeasurer(
			{ images: {} } as unknown as PDFDocument,
			new StyleContextStack(),
		);
		const result = measurer.measureImageWithDimensions(
			{ image: "...", width: "30%" } as MeasuredImageNode,
			{ width: 120, height: 60 },
		);

		assert.equal(result._width, 120);
		assert.equal(result._height, 60);
		assert.ok(Number.isFinite(result._width));
		assert.ok(Number.isFinite(result._height));
	});

	it("falls back to intrinsic dimensions for an invalid height", function () {
		const measurer = new ImageMeasurer(
			{ images: {} } as unknown as PDFDocument,
			new StyleContextStack(),
		);
		const result = measurer.measureImageWithDimensions(
			{ image: "...", height: "auto" } as MeasuredImageNode,
			{ width: 42, height: 42 },
		);

		assert.equal(result._width, 42);
		assert.equal(result._height, 42);
	});

	it("registers supported data URI images as inline resources", function () {
		const images: Record<string, string | Uint8Array | ArrayBuffer> = {};
		const measurer = new ImageMeasurer(
			{ images } as unknown as PDFDocument,
			new StyleContextStack(),
		);
		const node = { image: "data:image/png;base64,AQID" } as MeasuredImageNode;

		measurer.convertIfInlineImage(node);

		assert.equal(typeof node.image, "string");
		assert.equal(images[node.image as string], "data:image/png;base64,AQID");
	});
});
