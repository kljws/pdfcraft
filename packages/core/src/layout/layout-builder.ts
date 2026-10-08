import type { BuiltInMeasurement } from "../composition/built-in-measurement";
import type { BuiltInPreprocessing } from "../composition/built-in-preprocessing";
import type PageElementWriter from "./element-writer.page";
import { pack } from "../utils/tools";
import type { LayoutPdfNode } from "../types/internal";
import type PDFDocument from "../rendering/pdf-document";
import type { PageBreakBefore } from "../engine/page-break-before.types";
import type { Dictionary, PageOrientation, PdfCraftExtensions, Style, TableLayout } from "../types";
import type { PageMarginSource, PageSize, PdfPage } from "../types/internal";
import {
	layoutNodeWithLifecycle,
	type VerticalAlignmentControls,
} from "../engine/layout-node-lifecycle";
import {
	runBuiltInDocumentPass,
	runBuiltInDocumentPipeline,
} from "../composition/built-in-document-pipeline";
import { createBuiltInLayout } from "../composition/built-in-layout";
import { createBuiltInMeasurement } from "../composition/built-in-measurement";
import { createBuiltInPreprocessing } from "../composition/built-in-preprocessing";
import {
	advanceFlowRegion,
	type FlowAdvance,
	type FlowAdvanceOptions,
} from "../engine/layout-pagination";

/**
 * Layout engine which turns document-definition-object into a set of pages, lines, inlines
 * and vectors ready to be rendered into a PDF
 */
class LayoutBuilder {
	pageSize: PageSize;
	pageMargins: PageMarginSource;
	extensions: PdfCraftExtensions;
	/** Table layouts registered by the caller; tables resolve them by name. */
	tableLayouts: Dictionary<TableLayout> = {};
	nestedLevel = 0;
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
		this.layout = createBuiltInLayout(this);
	}

	registerTableLayouts(tableLayouts: Dictionary<TableLayout>): void {
		this.tableLayouts = pack(this.tableLayouts, tableLayouts);
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

	processNode(
		node: LayoutPdfNode,
		isVerticalAlignmentAllowed: boolean = false,
	): VerticalAlignmentControls | undefined {
		return layoutNodeWithLifecycle(node, isVerticalAlignmentAllowed, {
			writer: this.writer,
			linearNodeList: this.linearNodeList,
			suppressLinearNodeList: this.suppressLinearNodeList,
			decorateNode: (target) => this.layout.decorateNode(target),
			moveDownWithPageBreak: this.layout.moveDownWithPageBreak,
			layoutContent: (contentNode) => this.layout.layoutNode(contentNode),
		});
	}

	/** Continues in the next region of the enclosing container flow, or on the next page. */
	advanceFlowRegion(pageOrientation?: PageOrientation, options?: FlowAdvanceOptions): FlowAdvance {
		return advanceFlowRegion(this.writer, pageOrientation, options);
	}
}

export default LayoutBuilder;
