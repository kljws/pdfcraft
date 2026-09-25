import type DocMeasure from "../composition/doc-measure";
import type DocPreprocessor from "../composition/doc-preprocessor";
import type PageElementWriter from "./element-writer.page";
import { pack } from "../utils/tools";
import type { LayoutPdfNode, MeasuredPdfNode } from "../types/internal";
import type PDFDocument from "../rendering/pdf-document";
import type { PageBreakBefore } from "../engine/page-break-before.types";
import type {
	Dictionary,
	PageOrientation,
	PdfCraftExtensions,
	Style,
	TableLayout as PublicTableLayout,
} from "../types";
import type { PageMarginSource, PageSize, PdfPage, TableLayout } from "../types/internal";
import {
	layoutNodeWithLifecycle,
	type VerticalAlignmentStackEntry,
} from "../engine/layout-node-lifecycle";
import {
	createBuiltInDocumentProcessors,
	runBuiltInDocumentPass,
	runBuiltInDocumentPipeline,
} from "../composition/built-in-document-pipeline";
import { createBuiltInLayout } from "../composition/built-in-layout";
import type { DocumentLayoutPassResult } from "../engine/document-layout-pipeline";
import { moveDownWithPageBreak, moveToNextSnakingColumnOrPage } from "../engine/layout-pagination";
type TableLayoutSource = Partial<TableLayout> | PublicTableLayout;

/**
 * Layout engine which turns document-definition-object into a set of pages, lines, inlines
 * and vectors ready to be rendered into a PDF
 */
class LayoutBuilder {
	pageSize: PageSize;
	pageMargins: PageMarginSource;
	extensions: PdfCraftExtensions;
	tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>> = {};
	nestedLevel = 0;
	verticalAlignmentItemStack: VerticalAlignmentStackEntry[] = [];
	docPreprocessor!: DocPreprocessor;
	docMeasure!: DocMeasure;
	linearNodeList: LayoutPdfNode[] = [];
	suppressLinearNodeList = false;
	writer!: PageElementWriter;
	private readonly layout: ReturnType<typeof createBuiltInLayout>;

	/**
	 * @param pageSize - an object defining page width and height
	 * @param pageMargins - an object defining top, left, right and bottom margins
	 * @param extensions
	 */
	constructor(
		pageSize: PageSize,
		pageMargins: PageMarginSource,
		extensions: PdfCraftExtensions = [],
	) {
		this.pageSize = pageSize;
		this.pageMargins = pageMargins;
		this.extensions = extensions;
		this.layout = createBuiltInLayout(this, {
			moveDownWithPageBreak: (height, orientation) =>
				this.moveDownWithPageBreak(height, orientation),
		});
	}

	registerTableLayouts(tableLayouts: Dictionary<TableLayoutSource>): void {
		this.tableLayouts = pack(
			this.tableLayouts,
			tableLayouts as Dictionary<Partial<TableLayout<MeasuredPdfNode>>>,
		);
	}

	private moveDownWithPageBreak(height: number, pageOrientation?: PageOrientation): void {
		moveDownWithPageBreak(height, pageOrientation, {
			writer: this.writer,
			moveAcrossSnakingPage: (orientation) => this.snakingAwarePageBreak(orientation),
		});
	}

	/**
	 * Executes layout engine on document-definition-object and creates an array of pages
	 * containing positioned Blocks, Lines and inlines
	 *
	 * @param docStructure document-definition-object
	 * @param pdfDocument pdfkit document
	 * @param styleDictionary dictionary with style definitions
	 * @param defaultStyle default style definition
	 * @param background
	 * @param header
	 * @param footer
	 * @param watermark
	 * @param pageBreakBeforeFct
	 * @returns an array of pages
	 */
	layoutDocument(
		docStructure: unknown,
		pdfDocument: PDFDocument,
		styleDictionary: Dictionary<Style>,
		defaultStyle: Style,
		background: unknown,
		header: unknown,
		footer: unknown,
		watermark: unknown,
		pageBreakBeforeFct?: PageBreakBefore,
	): PdfPage[] {
		const processors = createBuiltInDocumentProcessors(
			pdfDocument,
			styleDictionary,
			defaultStyle,
			this.extensions,
			this.tableLayouts,
		);
		this.docPreprocessor = processors.preprocessor;
		this.docMeasure = processors.measure;

		return runBuiltInDocumentPipeline({
			extensions: this.extensions,
			pageBreakBefore: pageBreakBeforeFct,
			runPass: (pageCount, bottomMarginOverrides) =>
				this.tryLayoutDocument(
					docStructure,
					pdfDocument,
					styleDictionary,
					defaultStyle,
					background,
					header,
					footer,
					watermark,
					pageCount,
					bottomMarginOverrides,
				),
		});
	}

	tryLayoutDocument(
		docStructure: unknown,
		pdfDocument: PDFDocument,
		styleDictionary: Dictionary<Style>,
		defaultStyle: Style,
		background: unknown,
		header: unknown,
		footer: unknown,
		watermark: unknown,
		pageCount = 0,
		bottomMarginOverrides: readonly number[] = [],
	): DocumentLayoutPassResult {
		return runBuiltInDocumentPass(this, {
			docStructure,
			pdfDocument,
			defaultStyle,
			background,
			header,
			footer,
			watermark,
			pageCount,
			bottomMarginOverrides,
			requiresFirstPage: (document) => this.layout.requiresFirstPage(document),
		});
	}

	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed: boolean = false): void {
		layoutNodeWithLifecycle(node, isVerticalAlignmentAllowed, {
			writer: this.writer,
			linearNodeList: this.linearNodeList,
			suppressLinearNodeList: this.suppressLinearNodeList,
			verticalAlignmentItemStack: this.verticalAlignmentItemStack,
			decorateNode: (target) => this.layout.decorateNode(target),
			moveDownWithPageBreak: (height, orientation) =>
				this.moveDownWithPageBreak(height, orientation),
			layoutContent: (contentNode) => this.layout.layoutNode(contentNode),
		});
	}

	/**
	 * Helper for page breaks that respects snaking column context.
	 * When in snaking columns, first tries moving to next column.
	 * If no columns available, moves to next page and resets x to left margin.
	 * @param pageOrientation - Optional page orientation for the new page
	 */
	snakingAwarePageBreak(pageOrientation?: PageOrientation): void {
		moveToNextSnakingColumnOrPage(this.writer, pageOrientation);
	}
}

export default LayoutBuilder;
