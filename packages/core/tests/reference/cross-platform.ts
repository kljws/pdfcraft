/**
 * Shared by the Node.js and browser cross-platform checks: the same documents, fonts and image,
 * and one PDF summary that both platforms must produce. Runs in both environments, so it must not
 * import Node.js modules.
 */
import { SAMPLE_IMAGE, referenceDocuments } from "./reference-documents.ts";

export const FONT_FILES = {
	normal: "fonts/Roboto/Roboto-Regular.ttf",
	bold: "fonts/Roboto/Roboto-Medium.ttf",
	italics: "fonts/Roboto/Roboto-Italic.ttf",
	bolditalics: "fonts/Roboto/Roboto-MediumItalic.ttf",
} as const;

/** Where each platform finds a repository file: a path in Node.js, a URL in the browser. */
export type LocateResource = (repositoryPath: string) => string;

const replaceImage = (value: unknown): unknown => {
	if (value === SAMPLE_IMAGE) return "sample";
	if (Array.isArray(value)) return value.map(replaceImage);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, replaceImage(item)]),
		);
	}
	return value;
};

/** The reference documents with the sample image registered once and located per platform. */
export function crossPlatformDocuments(
	locate: LocateResource,
): Record<string, Record<string, unknown>> {
	return Object.fromEntries(
		Object.entries(referenceDocuments).map(([name, { definition }]) => [
			name,
			{ ...(replaceImage(definition) as object), images: { sample: locate(SAMPLE_IMAGE) } },
		]),
	);
}

export function crossPlatformFonts(locate: LocateResource) {
	return {
		Roboto: Object.fromEntries(
			Object.entries(FONT_FILES).map(([style, file]) => [style, locate(file)]),
		) as Record<keyof typeof FONT_FILES, string>,
	};
}

/** The subset of pdf.js used by the summary, identical in its Node.js and browser builds. */
export interface PdfJs {
	OPS: Record<string, number>;
	getDocument(source: { data: Uint8Array; verbosity?: number }): {
		promise: Promise<PdfJsDocument>;
		destroy(): Promise<void>;
	};
}
interface PdfJsDocument {
	numPages: number;
	getPage(pageNumber: number): Promise<{
		view: number[];
		getTextContent(): Promise<{
			items: Array<{ str?: string; transform?: number[]; width?: number }>;
		}>;
		getOperatorList(): Promise<{ fnArray: number[] }>;
	}>;
}

/** Drawing operations whose counts describe what each page paints besides text. */
const PAINT_OPERATIONS = [
	"paintImageXObject",
	"paintInlineImageXObject",
	"constructPath",
	"fill",
	"eoFill",
	"stroke",
	"fillStroke",
	"showText",
];

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * Reduces a PDF to what a reader sees: page sizes, every text run with its position and size,
 * and counts of painting operations. Metadata such as creation dates and object ordering is
 * ignored, so equal summaries mean equal pagination, content and layout.
 */
export async function summarizePdf(pdfjs: PdfJs, pdf: Uint8Array) {
	const loadingTask = pdfjs.getDocument({ data: pdf.slice(), verbosity: 0 });
	const document = await loadingTask.promise;
	try {
		const pages = [];
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
			const page = await document.getPage(pageNumber);
			const text = (await page.getTextContent()).items
				.filter((item) => item.str && item.transform)
				.map((item) => ({
					text: item.str!,
					x: round(item.transform![4]),
					y: round(item.transform![5]),
					size: round(Math.hypot(item.transform![0], item.transform![1])),
					width: round(item.width ?? 0),
				}));
			const operations = (await page.getOperatorList()).fnArray;
			const painting = Object.fromEntries(
				PAINT_OPERATIONS.map((name) => [
					name,
					operations.filter((operation) => operation === pdfjs.OPS[name]).length,
				]),
			);
			pages.push({ size: page.view.slice(2).map(round), text, painting });
		}
		return { pageCount: document.numPages, pages };
	} finally {
		await loadingTask.destroy();
	}
}

export const CROSS_PLATFORM_SNAPSHOT = "cross-platform.summary.json";
