import type { BuiltInMeasurement } from "../composition/built-in-measurement";
import type { BuiltInPreprocessing } from "../composition/built-in-preprocessing";
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
	runBuiltInDocumentPass,
	runBuiltInDocumentPipeline,
} from "../composition/built-in-document-pipeline";
import { createBuiltInLayout } from "../composition/built-in-layout";
import { createBuiltInMeasurement } from "../composition/built-in-measurement";
import { createBuiltInPreprocessing } from "../composition/built-in-preprocessing";
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
	preprocessing!: BuiltInPreprocessing;
	measurement!: BuiltInMeasurement;
	linearNodeList: LayoutPdfNode[] = [];
	suppressLinearNodeList = false;
	writer!: PageElementWriter;
	private readonly layout: ReturnType<typeof createBuiltInLayout>;

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

	/** Lays out a document definition into pages of positioned lines, inlines and vectors. */
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
		this.preprocessing = createBuiltInPreprocessing(this.extensions);
		this.measurement = createBuiltInMeasurement({
			document: pdfDocument,
			styleDictionary,
			defaultStyle,
			extensions: this.extensions,
			tableLayouts: this.tableLayouts,
		});

		return runBuiltInDocumentPipeline({
			extensions: this.extensions,
			pageBreakBefore: pageBreakBeforeFct,
			runPass: (pageCount, bottomMarginOverrides) =>
				runBuiltInDocumentPass(this, {
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
				}),
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

	/** Moves to the next snaking column when one is available, otherwise to the next page. */
	snakingAwarePageBreak(pageOrientation?: PageOrientation): void {
		moveToNextSnakingColumnOrPage(this.writer, pageOrientation);
	}
}

export default LayoutBuilder;
