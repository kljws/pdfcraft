import { createBuiltInMeasurement } from "../../composition/built-in-measurement.ts";
import type PDFDocument from "../../rendering/pdf-document.ts";
import type { Dictionary, PdfCraftExtensions, Style } from "../../types/index.ts";
import type {
	MeasuredPdfNode,
	PdfFont,
	PreprocessedPdfNode,
	TableLayout,
} from "../../types/internal.ts";

export const sampleTestProvider = {
	provideFont: (_familyName: string, bold: boolean, italics: boolean): PdfFont => ({
		ascender: 0,
		descender: 0,
		widthOfString: (text: string, size: number) =>
			text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1),
		lineHeight: (size: number) => size,
	}),
};

/**
 * Built-in measurement over a stub PDF document. `measureNode` accepts fixtures that were
 * preprocessed in place and returns them as the shape the test inspects.
 */
export function createTestMeasurement<Measured = MeasuredPdfNode>(
	document: unknown,
	styleDictionary: Dictionary<Style> = {},
	defaultStyle: Style = {},
	extensions: PdfCraftExtensions = [],
	tableLayouts: Dictionary<Partial<TableLayout>> = {},
) {
	const measurement = createBuiltInMeasurement({
		document: document as PDFDocument,
		styleDictionary,
		defaultStyle,
		extensions,
		tableLayouts: tableLayouts as Dictionary<Partial<TableLayout<MeasuredPdfNode>>>,
	});
	return {
		measureNode: (node: unknown): Measured =>
			measurement.measureNode(node as PreprocessedPdfNode) as Measured,
	};
}
