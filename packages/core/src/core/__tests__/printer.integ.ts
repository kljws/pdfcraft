import { describe, expect, it, vi } from "vitest";
import type PDFDocument from "../../rendering/pdf-document.ts";
import Printer from "../printer.ts";
import { VirtualFileSystem } from "../../resources/virtual-file-system.ts";
import URLResolver from "../../resources/url-resolver.ts";
import type { PrinterDocumentDefinition } from "../printer.types.ts";

const shortSide = 1000;
const longSide = 2000;

function createPrinter(): Printer {
	const virtualfs = new VirtualFileSystem();
	return new Printer(
		{ Roboto: { normal: "fonts/Roboto/Roboto-Regular.ttf" } },
		virtualfs,
		new URLResolver(virtualfs),
	);
}

/** Finishes the PDFKit document and returns its bytes. */
function finish(document: PDFDocument): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const chunks: Uint8Array[] = [];
		document.on("data", (chunk: Uint8Array) => chunks.push(chunk));
		document.on("error", reject);
		document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
		document.end();
	});
}

/** Generates the document and reads the page sizes of the resulting PDF with pdf.js. */
async function pageSizes(definition: PrinterDocumentDefinition): Promise<number[][]> {
	const pdf = await finish(await createPrinter().createPdfKitDocument(definition));
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const loadingTask = pdfjs.getDocument({ data: pdf, verbosity: 0 });
	const document = await loadingTask.promise;
	try {
		const sizes: number[][] = [];
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
			sizes.push((await document.getPage(pageNumber)).view.slice(2));
		}
		return sizes;
	} finally {
		await loadingTask.destroy();
	}
}

const pages = (...texts: Array<Record<string, unknown>>) => texts;

describe("Printer", () => {
	it("rejects an embedded file without a source", async () => {
		await expect(
			createPrinter().createPdfKitDocument({
				content: ["Document"],
				files: { invalid: {} },
			} as unknown as PrinterDocumentDefinition),
		).rejects.toThrow("File 'invalid' is missing a source");
	});

	it.each([
		{
			name: "default portrait to landscape",
			pageOrientation: undefined,
			content: pages(
				{ text: "1" },
				{ text: "2", pageBreak: "before", pageOrientation: "landscape" },
			),
			expected: [
				[shortSide, longSide],
				[longSide, shortSide],
			],
		},
		{
			name: "portrait to landscape",
			pageOrientation: "portrait",
			content: pages(
				{ text: "1" },
				{ text: "2", pageBreak: "before", pageOrientation: "landscape" },
			),
			expected: [
				[shortSide, longSide],
				[longSide, shortSide],
			],
		},
		{
			name: "landscape to portrait, kept by later pages",
			pageOrientation: "landscape",
			content: pages(
				{ text: "1" },
				{ text: "2", pageBreak: "before", pageOrientation: "portrait" },
				{ text: "3", pageBreak: "before" },
			),
			expected: [
				[longSide, shortSide],
				[shortSide, longSide],
				[shortSide, longSide],
			],
		},
		{
			name: "landscape to landscape",
			pageOrientation: "portrait",
			content: pages(
				{ text: "1" },
				{ text: "2", pageBreak: "before", pageOrientation: "landscape" },
				{ text: "3", pageOrientation: "landscape", pageBreak: "after" },
			),
			expected: [
				[shortSide, longSide],
				[longSide, shortSide],
				[longSide, shortSide],
			],
		},
	])(
		"writes page sizes for orientation changes: $name",
		async ({ pageOrientation, content, expected }) => {
			const definition = {
				pageSize: { width: shortSide, height: longSide },
				...(pageOrientation && { pageOrientation }),
				content,
			} as unknown as PrinterDocumentDefinition;
			expect(await pageSizes(definition)).toEqual(expected);
		},
	);

	it("draws list bullets as ellipse vectors", async () => {
		const document = await createPrinter().createPdfKitDocument({
			content: [{ stack: [{ ul: [{ text: "item1" }, { text: "item2" }] }] }],
		});
		const ellipses = document._pdfCraftPages
			.flatMap((page) => page.items)
			.filter((entry) => entry.type === "vector" && entry.item.type === "ellipse");

		expect(ellipses).toHaveLength(2);
		for (const { item } of ellipses) {
			expect(item).toMatchObject({
				x: expect.any(Number),
				y: expect.any(Number),
				r1: expect.any(Number),
				r2: expect.any(Number),
			});
		}
	});

	it.each([
		{ maxPagesNumber: 1, expected: 1 },
		{ maxPagesNumber: undefined, expected: 3 },
		{ maxPagesNumber: 0, expected: 0 },
	])(
		"writes $expected pages when maxPagesNumber is $maxPagesNumber",
		async ({ maxPagesNumber, expected }) => {
			const document = await createPrinter().createPdfKitDocument({
				pageSize: "A4",
				...(maxPagesNumber !== undefined && { maxPagesNumber }),
				content: [
					{ text: "Page 1" },
					{ text: "Page 2", pageBreak: "before", pageOrientation: "landscape" },
					{ text: "Page 3", pageBreak: "before" },
				],
			});

			expect(document.pdfCraftPageInfo).toEqual({
				pageCount: expected,
				totalPageCount: 3,
				truncated: expected < 3,
			});
			if (expected > 0) {
				const pdf = await finish(document);
				const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
				const loadingTask = pdfjs.getDocument({ data: pdf, verbosity: 0 });
				expect((await loadingTask.promise).numPages).toBe(expected);
				await loadingTask.destroy();
			}
		},
	);

	it("reports progress on each rendered item when a progressCallback is passed", async () => {
		const progressCallback = vi.fn((_progress: number) => {});

		await createPrinter().createPdfKitDocument(
			{
				pageSize: "A4",
				content: [
					{ text: "Text item 1" },
					{
						image:
							"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==",
					},
					{ text: "Text item 2" },
					{ canvas: [{ type: "rect", x: 0, y: 0, w: 310, h: 260 }] },
				],
			},
			{ progressCallback },
		);

		expect(progressCallback.mock.calls.map(([progress]) => progress)).toEqual([0.25, 0.5, 0.75, 1]);
	});

	it("generates a document without a progressCallback", async () => {
		const pdf = await finish(
			await createPrinter().createPdfKitDocument({
				pageSize: "A4",
				content: [{ text: "Text item 1" }],
			}),
		);
		expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
	});
});
