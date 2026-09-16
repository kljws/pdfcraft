import StyleContextStack from "../services/styles/style-context-stack";
import type { Dictionary, PdfCraftExtensions, Style } from "../types";
import type { MeasuredPdfNode, PreprocessedPdfNode, TableLayout } from "../types/internal";
import type PDFDocument from "../rendering/pdf-document";
import {
	createBuiltInMeasurement,
	type BuiltInMeasurement,
} from "../composition/built-in-measurement";

class DocMeasure {
	readonly pdfDocument: PDFDocument;
	readonly textInlines: BuiltInMeasurement["textInlines"];
	readonly styleStack: StyleContextStack;
	readonly extensions: PdfCraftExtensions;
	readonly tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>;
	protected readonly media: BuiltInMeasurement["media"];
	private readonly measurement: BuiltInMeasurement;

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
		this.media = this.measurement.media;
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

	measureAcroForm(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureAcroForm(node);
	}

	measureVerticalContainer(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureVerticalContainer(node);
	}

	measureColumns(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureColumns(node);
	}

	measureList(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureList(node);
	}

	measureUnorderedList(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureUnorderedList(node);
	}

	measureOrderedList(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureOrderedList(node);
	}

	measureSection(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureSection(node);
	}

	measureLeaf(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureLeaf(node);
	}

	measureToc(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureToc(node);
	}

	measureTable(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureTable(node);
	}

	measureCanvas(node: MeasuredPdfNode): MeasuredPdfNode {
		return this.measurement.measureCanvas(node);
	}
}

export default DocMeasure;
