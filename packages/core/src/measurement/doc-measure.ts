import StyleContextStack from "../services/styles/style-context-stack";
import type { Dictionary, PdfCraftExtensions, Style } from "../types";
import type { MeasuredPdfNode, PreprocessedPdfNode, TableLayout } from "../types/internal";
import type PDFDocument from "../rendering/pdf-document";
import { createBuiltInMeasurement } from "../composition/built-in-measurement";

class DocMeasure {
	readonly pdfDocument: PDFDocument;
	readonly textInlines: ReturnType<typeof createBuiltInMeasurement>["textInlines"];
	readonly styleStack: StyleContextStack;
	readonly extensions: PdfCraftExtensions;
	readonly tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>;
	private readonly measurement: ReturnType<typeof createBuiltInMeasurement>;

	constructor(
		pdfDocument: PDFDocument,
		styleDictionary: Dictionary<Style>,
		defaultStyle: Style,
		extensions: PdfCraftExtensions = [],
		tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>> = {},
	) {
		this.pdfDocument = pdfDocument;
		this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
		this.extensions = extensions;
		this.tableLayouts = tableLayouts;
		this.measurement = createBuiltInMeasurement(this);
		this.textInlines = this.measurement.textInlines;
	}

	/**
	 * Measures all nodes and sets min/max-width properties required for the second
	 * layout-pass.
	 *
	 * @param docStructure document-definition-object
	 * @returns document-measurement-object
	 */
	measureDocument(docStructure: PreprocessedPdfNode): MeasuredPdfNode {
		return this.measureNode(docStructure);
	}

	measureBlock(node: PreprocessedPdfNode): MeasuredPdfNode {
		return this.measureNode(node);
	}

	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode {
		return this.measurement.measureNode(node);
	}
}

export default DocMeasure;
