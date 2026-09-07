import { assert, beforeEach, describe, expect, it, vi } from "vitest";
import PDFDocument from "../../rendering/pdf-document.ts";
import Printer from "../printer.ts";
import { VirtualFileSystem } from "../../resources/virtual-file-system.ts";
import URLResolver from "../../resources/url-resolver.ts";
import type { PrinterDocumentDefinition, PrinterFontDescriptors } from "../printer.types.ts";

const addPageMock = () => vi.mocked(PDFDocument.prototype.addPage);
const ellipseMock = () => vi.mocked(PDFDocument.prototype.ellipse);
const pageOptions = (index: number) => addPageMock().mock.calls[index][0]!;
const virtualfs = new VirtualFileSystem();

describe("Printer", function () {
	var SHORT_SIDE = 1000,
		LONG_SIDE = 2000;
	var fontDescriptors: PrinterFontDescriptors;
	var printer: Printer;

	beforeEach(function () {
		fontDescriptors = {
			Roboto: {
				normal: "fonts/Roboto/Roboto-Regular.ttf",
			},
		};
		PDFDocument.prototype.addPage = vi.fn(PDFDocument.prototype.addPage);
	});

	it("rejects an embedded file without a source", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		await expect(
			printer.createPdfKitDocument({
				content: ["Document"],
				files: { invalid: {} },
			} as unknown as PrinterDocumentDefinition),
		).rejects.toThrow("File 'invalid' is missing a source");
	});

	it("should pass switched width and height to pdfkit if page orientation changes from default portrait to landscape", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));
		var docDefinition: PrinterDocumentDefinition = {
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: "Page 1",
				},
				{
					text: "Page 2",
					pageBreak: "before",
					pageOrientation: "landscape",
				},
			],
		};
		await printer.createPdfKitDocument(docDefinition);

		assert(addPageMock().mock.calls.length === 2);

		assert.deepEqual(pageOptions(0).size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(pageOptions(1).size, [LONG_SIDE, SHORT_SIDE]);
	});

	it("should pass switched width and height to pdfkit if page orientation changes from portrait to landscape", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));
		var docDefinition: PrinterDocumentDefinition = {
			pageOrientation: "portrait",
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: "Page 1",
				},
				{
					text: "Page 2",
					pageBreak: "before",
					pageOrientation: "landscape",
				},
			],
		};
		await printer.createPdfKitDocument(docDefinition);

		assert(addPageMock().mock.calls.length === 2);

		assert.deepEqual(pageOptions(0).size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(pageOptions(1).size, [LONG_SIDE, SHORT_SIDE]);
	});

	it("should pass switched width and height to pdfkit if page orientation changes from landscape to portrait", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var docDefinition: PrinterDocumentDefinition = {
			pageOrientation: "landscape",
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: "Page 1",
				},
				{
					text: "Page 2",
					pageBreak: "before",
					pageOrientation: "portrait",
				},
				{
					text: "Page 3 still portrait",
					pageBreak: "before",
				},
			],
		};
		await printer.createPdfKitDocument(docDefinition);

		assert(addPageMock().mock.calls.length === 3);

		assert.deepEqual(pageOptions(0).size, [LONG_SIDE, SHORT_SIDE]);
		assert.deepEqual(pageOptions(1).size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(pageOptions(2).size, [SHORT_SIDE, LONG_SIDE]);
	});

	it("should not switch width and height for pdfkit if page orientation changes from landscape to landscape", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));
		var docDefinition: PrinterDocumentDefinition = {
			pageOrientation: "portrait",
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					text: "Page 1",
				},
				{
					text: "Page 2",
					pageBreak: "before",
					pageOrientation: "landscape",
				},
				{
					text: "Page 3 landscape again",
					pageOrientation: "landscape",
					pageBreak: "after",
				},
			],
		};
		await printer.createPdfKitDocument(docDefinition);

		assert.equal(addPageMock().mock.calls.length, 3);

		assert.deepEqual(pageOptions(0).size, [SHORT_SIDE, LONG_SIDE]);
		assert.deepEqual(pageOptions(1).size, [LONG_SIDE, SHORT_SIDE]);
		assert.deepEqual(pageOptions(2).size, [LONG_SIDE, SHORT_SIDE]);
	});

	it("should print bullet vectors as ellipses", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));
		var docDefinition: PrinterDocumentDefinition = {
			pageOrientation: "portrait",
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					stack: [
						{
							ul: [{ text: "item1" }, { text: "item2" }],
						},
					],
				},
			],
		};
		PDFDocument.prototype.ellipse = vi.fn(PDFDocument.prototype.ellipse);

		await printer.createPdfKitDocument(docDefinition);

		function assertEllipse(ellipseCallArgs: [number, number, number, number?]) {
			var firstEllipse = {
				x: ellipseCallArgs[0],
				y: ellipseCallArgs[1],
				r1: ellipseCallArgs[2],
				r2: ellipseCallArgs[3],
			};
			assert(firstEllipse.x !== undefined);
			assert(!isNaN(firstEllipse.x));
			assert(firstEllipse.y !== undefined);
			assert(!isNaN(firstEllipse.y));
			assert(firstEllipse.r1 !== undefined);
			assert(!isNaN(firstEllipse.r1));
			assert(firstEllipse.r2 !== undefined);
			assert(!isNaN(firstEllipse.r2));
		}

		assert.equal(ellipseMock().mock.calls.length, 2);

		assertEllipse(ellipseMock().mock.calls[0]);
		assertEllipse(ellipseMock().mock.calls[1]);
	});

	it("should print only the require number of pages", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var docDefinition: PrinterDocumentDefinition = {
			pageSize: "A4",
			maxPagesNumber: 1,
			content: [
				{
					text: "Page 1",
				},
				{
					text: "Page 2",
					pageBreak: "before",
					pageOrientation: "landscape",
				},
			],
		};

		await printer.createPdfKitDocument(docDefinition);

		assert(addPageMock().mock.calls.length === 1);
	});

	it("should print all pages when maxPagesNumber is undefined", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var docDefinition: PrinterDocumentDefinition = {
			pageSize: "A4",
			content: [
				{
					text: "Page 1",
				},
				{
					text: "Page 2",
					pageBreak: "before",
					pageOrientation: "landscape",
				},
				{
					text: "Page 3",
					pageBreak: "before",
				},
			],
		};

		await printer.createPdfKitDocument(docDefinition);

		assert(addPageMock().mock.calls.length === 3);
	});

	it("should print no pages when maxPagesNumber is zero", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		await printer.createPdfKitDocument({
			pageSize: "A4",
			maxPagesNumber: 0,
			content: [{ text: "Page 1" }],
		});

		expect(addPageMock()).not.toHaveBeenCalled();
	});

	it("should report progress on each rendered item when a progressCallback is passed", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var progressCallback = vi.fn(function (_progress: number) {});

		var docDefinition: PrinterDocumentDefinition = {
			pageSize: "A4",
			content: [
				{
					text: "Text item 1",
				},
				{
					image:
						"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==",
				},
				{
					text: "Text item 2",
				},
				{
					canvas: [
						{
							type: "rect",
							x: 0,
							y: 0,
							w: 310,
							h: 260,
						},
					],
				},
			],
		};

		await printer.createPdfKitDocument(docDefinition, { progressCallback: progressCallback });

		assert.deepEqual(
			progressCallback.mock.calls.map(([progress]) => progress),
			[0.25, 0.5, 0.75, 1],
		);
	});

	it("should work without a progressCallback", async function () {
		printer = new Printer(fontDescriptors, virtualfs, new URLResolver(virtualfs));

		var docDefinition: PrinterDocumentDefinition = {
			pageSize: "A4",
			content: [{ text: "Text item 1" }],
		};

		await printer.createPdfKitDocument(docDefinition);
	});
});
