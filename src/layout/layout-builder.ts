import DocMeasure from "../measurement/doc-measure";
import DocPreprocessor from "../preprocessing/doc-preprocessor";
import DocumentContext from "../document/document-context";
import PageElementWriter from "./element-writer.page";
import ColumnCalculator from "./column-calculator";
import { stringifyNode } from "../utils/node";
import { pack } from "../utils/tools";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../types/internal";
import { decorateNode } from "./node.decorators";
import { addAll, getPageSpanHeight } from "./layout-builder.helpers";
import { addPageBreaksIfNecessary, resetNodePositions } from "./layout-builder.page-breaks";
import LayoutBuilderContent from "./layout-builder.content";
import LayoutBuilderRepeatables from "./layout-builder.repeatables";
import LayoutBuilderRows from "./layout-builder.rows";
import type SVGMeasure from "../measurement/svg-measure";
import type PDFDocument from "../rendering/pdf-document";
import type {
	Dictionary,
	PageOrientation,
	Style,
	TableLayout as PublicTableLayout,
} from "../types";
import type { PageMarginSource, PageSize, PdfPage, TableLayout } from "../types/internal";
import type { VerticalAlignmentStackEntry } from "./layout-builder.rows";
import type { LayoutResult, PageBreakBefore } from "./layout-builder.types";
import { resolveSectionPage, type SectionNode } from "./layout-builder.sections";
type TableLayoutSource = Partial<TableLayout> | PublicTableLayout;

/**
 * Layout engine which turns document-definition-object into a set of pages, lines, inlines
 * and vectors ready to be rendered into a PDF
 */
class LayoutBuilder {
	pageSize: PageSize;
	pageMargins: PageMarginSource;
	svgMeasure: SVGMeasure;
	tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>> = {};
	nestedLevel = 0;
	verticalAlignmentItemStack: VerticalAlignmentStackEntry[] = [];
	docPreprocessor!: DocPreprocessor;
	docMeasure!: DocMeasure;
	linearNodeList: LayoutPdfNode[] = [];
	suppressLinearNodeList = false;
	writer!: PageElementWriter;
	private readonly rows: LayoutBuilderRows;
	private readonly content: LayoutBuilderContent;
	private readonly repeatables: LayoutBuilderRepeatables;

	/**
	 * @param pageSize - an object defining page width and height
	 * @param pageMargins - an object defining top, left, right and bottom margins
	 * @param svgMeasure
	 */
	constructor(pageSize: PageSize, pageMargins: PageMarginSource, svgMeasure: SVGMeasure) {
		this.pageSize = pageSize;
		this.pageMargins = pageMargins;
		this.svgMeasure = svgMeasure;
		this.rows = new LayoutBuilderRows(this);
		this.content = new LayoutBuilderContent(this);
		this.repeatables = new LayoutBuilderRepeatables(this);
	}

	registerTableLayouts(tableLayouts: Dictionary<TableLayoutSource>): void {
		this.tableLayouts = pack(
			this.tableLayouts,
			tableLayouts as Dictionary<Partial<TableLayout<MeasuredPdfNode>>>,
		);
	}

	processRow(
		options: Parameters<LayoutBuilderRows["processRow"]>[0],
	): ReturnType<LayoutBuilderRows["processRow"]> {
		return this.rows.processRow(options);
	}

	private moveDownWithPageBreak(height: number, pageOrientation?: PageOrientation): void {
		let remainingHeight = Math.max(0, height);

		while (remainingHeight > this.writer.context().availableHeight) {
			const availableHeight = this.writer.context().availableHeight;
			if (availableHeight > 0) {
				this.writer.context().moveDown(availableHeight);
				remainingHeight -= availableHeight;
			}

			if (
				this.writer.context().inSnakingColumns() &&
				!this.writer.context().isInNestedNonSnakingGroup()
			) {
				this.snakingAwarePageBreak(pageOrientation);
			} else {
				this.writer.moveToNextPage(pageOrientation);
			}

			if (availableHeight <= 0 && this.writer.context().availableHeight <= 0) {
				throw new Error("Cannot apply vertical spacing on a page with no available height");
			}
		}

		this.writer.context().moveDown(remainingHeight);
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
		this.docPreprocessor = new DocPreprocessor();
		this.docMeasure = new DocMeasure(
			pdfDocument,
			styleDictionary,
			defaultStyle,
			this.svgMeasure,
			this.tableLayouts,
		);

		const maxLayoutPasses = 10;
		let assumedPageCount = 0;
		let layoutPass = 1;
		const pageCountHistory = [assumedPageCount];
		let warnedAboutCycle = false;
		let result = this.tryLayoutDocument(
			docStructure,
			pdfDocument,
			styleDictionary,
			defaultStyle,
			background,
			header,
			footer,
			watermark,
			assumedPageCount,
		);
		while (layoutPass < maxLayoutPasses) {
			const nextPageCount = result.pages.length;
			const marginsNeedAnotherPass =
				Boolean(result.pageMarginFunctionUsed) && assumedPageCount !== nextPageCount;
			const pageBreakNeedsAnotherPass = addPageBreaksIfNecessary(
				result.linearNodeList,
				result.pages,
				pageBreakBeforeFct,
			);

			if (!marginsNeedAnotherPass && !pageBreakNeedsAnotherPass) break;

			if (marginsNeedAnotherPass) {
				if (!warnedAboutCycle && pageCountHistory.includes(nextPageCount)) {
					console.warn(
						"Non-convergent dynamic pageMargins detected; layout stopped after a bounded number of passes.",
					);
					warnedAboutCycle = true;
				}
				assumedPageCount = nextPageCount;
				pageCountHistory.push(nextPageCount);
			}

			resetNodePositions(result);
			result = this.tryLayoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				assumedPageCount,
			);
			layoutPass++;
		}

		return result.pages;
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
	): LayoutResult {
		const isNecessaryAddFirstPage = (document: LayoutPdfNode): boolean => {
			if (document.stack && document.stack.length > 0 && document.stack[0].section) {
				return false;
			} else if (document.section) {
				return false;
			}

			return true;
		};

		this.linearNodeList = [];
		const processedDocument: PreprocessedPdfNode =
			this.docPreprocessor.preprocessDocument(docStructure);
		const measuredDocument: MeasuredPdfNode = this.docMeasure.measureDocument(processedDocument);
		const layoutDocument = measuredDocument as LayoutPdfNode;

		const documentContext = new DocumentContext();
		documentContext.pageMarginSource = this.pageMargins;
		documentContext.pageCount = pageCount;
		this.writer = new PageElementWriter(documentContext);

		this.writer.context().addListener("pageAdded", (page: PdfPage) => {
			let backgroundGetter = background;
			if (page.customProperties["background"] || page.customProperties["background"] === null) {
				backgroundGetter = page.customProperties["background"];
			}

			this.repeatables.addBackground(backgroundGetter);
		});

		if (isNecessaryAddFirstPage(layoutDocument)) {
			this.writer.addPage(this.pageSize, null, this.pageMargins);
		}

		this.processNode(layoutDocument);
		this.repeatables.addHeadersAndFooters(header, footer);
		this.repeatables.addWatermark(watermark, pdfDocument, defaultStyle);

		return {
			pages: this.writer.context().pages,
			linearNodeList: this.linearNodeList,
			pageMarginFunctionUsed: this.writer.context().pageMarginFunctionUsed,
		};
	}

	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed: boolean = false): void {
		const applyMargins = (callback: () => void): void => {
			let margin = node._margin;

			if (node.pageBreak === "before") {
				this.writer.moveToNextPage(node.pageOrientation);
			} else if (node.pageBreak === "beforeOdd") {
				this.writer.moveToNextPage(node.pageOrientation);
				if ((this.writer.context().page + 1) % 2 === 1) {
					this.writer.moveToNextPage(node.pageOrientation);
				}
			} else if (node.pageBreak === "beforeEven") {
				this.writer.moveToNextPage(node.pageOrientation);
				if ((this.writer.context().page + 1) % 2 === 0) {
					this.writer.moveToNextPage(node.pageOrientation);
				}
			}

			const isDetachedBlock = node.relativePosition || node.absolutePosition;

			// Detached nodes have no margins, their position is only determined by 'x' and 'y'
			if (margin && !isDetachedBlock) {
				this.moveDownWithPageBreak(margin[1], node.pageOrientation);
				// Apply lateral margins
				this.writer.context().addMargin(margin[0], margin[2]);
			}
			callback();

			// Detached nodes have no margins, their position is only determined by 'x' and 'y'
			if (margin && !isDetachedBlock) {
				// Lateral margins only apply to the node itself, not to a page reached by its bottom margin.
				this.writer.context().addMargin(-margin[0], -margin[2]);
				this.moveDownWithPageBreak(margin[3], node.pageOrientation);
			}

			if (node.pageBreak === "after") {
				this.writer.moveToNextPage(node.pageOrientation);
			} else if (node.pageBreak === "afterOdd") {
				this.writer.moveToNextPage(node.pageOrientation);
				if ((this.writer.context().page + 1) % 2 === 1) {
					this.writer.moveToNextPage(node.pageOrientation);
				}
			} else if (node.pageBreak === "afterEven") {
				this.writer.moveToNextPage(node.pageOrientation);
				if ((this.writer.context().page + 1) % 2 === 0) {
					this.writer.moveToNextPage(node.pageOrientation);
				}
			}
		};

		if (!this.suppressLinearNodeList) this.linearNodeList.push(node);
		decorateNode(node);

		let startPosition: ReturnType<DocumentContext["getCurrentPosition"]> | undefined;
		if (this.writer.context().getCurrentPage()) {
			startPosition = this.writer.context().getCurrentPosition();
		}

		applyMargins(() => {
			let verticalAlignment = node.verticalAlignment;
			let verticalAlignmentBegin: ReturnType<PageElementWriter["beginVerticalAlignment"]> | null =
				null;
			if (isVerticalAlignmentAllowed && verticalAlignment) {
				verticalAlignmentBegin = this.writer.beginVerticalAlignment(verticalAlignment);
			}

			let unbreakable = node.unbreakable;
			if (unbreakable) {
				this.writer.beginUnbreakableBlock();
			}

			let absPosition = node.absolutePosition;
			if (absPosition) {
				this.writer.context().beginDetachedBlock();
				this.writer.context().moveTo(absPosition.x || 0, absPosition.y || 0);
			}

			let relPosition = node.relativePosition;
			if (relPosition) {
				this.writer.context().beginDetachedBlock();
				this.writer.context().moveToRelative(relPosition.x || 0, relPosition.y || 0);
			}

			if (node.stack) {
				this.processVerticalContainer(node);
			} else if (node.section) {
				this.processSection(node);
			} else if (node.columns) {
				this.processColumns(node);
			} else if (node.ul) {
				this.content.processList(false, node);
			} else if (node.ol) {
				this.content.processList(true, node);
			} else if (node.table) {
				this.rows.processTable(node);
			} else if (node.text !== undefined) {
				this.content.processLeaf(node);
			} else if (node.toc) {
				this.content.processToc(node);
			} else if (node.image) {
				this.content.processImage(node);
			} else if (node.svg) {
				this.content.processSVG(node);
			} else if (node.canvas) {
				this.content.processCanvas(node);
			} else if (node.qr) {
				this.content.processQr(node);
			} else if (node.attachment) {
				this.content.processAttachment(node);
			} else if (node.acroform) {
				this.content.processAcroForm(node);
			} else if (!node._span) {
				throw new Error(`Unrecognized document structure: ${stringifyNode(node)}`);
			}

			if (absPosition || relPosition) {
				this.writer.context().endDetachedBlock();
			}

			if (unbreakable) {
				this.writer.commitUnbreakableBlock();
			}

			if (isVerticalAlignmentAllowed && verticalAlignment && verticalAlignmentBegin) {
				this.verticalAlignmentItemStack.push({
					begin: verticalAlignmentBegin as VerticalAlignmentStackEntry["begin"],
					end: this.writer.endVerticalAlignment(
						verticalAlignment,
					) as VerticalAlignmentStackEntry["end"],
				});
			}
		});

		if (startPosition) {
			node.__height = getPageSpanHeight(
				startPosition,
				this.writer.context().getCurrentPosition(),
				this.writer.context().pages,
			);
		}
	}

	/**
	 * Helper for page breaks that respects snaking column context.
	 * When in snaking columns, first tries moving to next column.
	 * If no columns available, moves to next page and resets x to left margin.
	 * @param pageOrientation - Optional page orientation for the new page
	 */
	snakingAwarePageBreak(pageOrientation?: PageOrientation): void {
		let ctx = this.writer.context();
		let snakingSnapshot = ctx.getSnakingSnapshot();
		if (!snakingSnapshot) {
			return;
		}

		// Try flowing to next column first
		if (this.writer.canMoveToNextColumn()) {
			this.writer.moveToNextColumn();
			return;
		}

		// No more columns available, move to new page
		this.writer.moveToNextPage(pageOrientation);

		// Reset snaking column state for the new page
		// Save lastColumnWidth before reset — if we're inside a nested
		// column group (e.g. product/price row), the reset would overwrite
		// it with the snaking column width, corrupting inner column layout.
		let savedLastColumnWidth = ctx.lastColumnWidth;
		ctx.resetSnakingColumnsForNewPage();
		ctx.lastColumnWidth = savedLastColumnWidth;
	}

	// vertical container
	processVerticalContainer(node: LayoutPdfNode): void {
		node.stack!.forEach((item: LayoutPdfNode, index: number) => {
			this.processNode(item);
			addAll(node.positions!, item.positions!);

			if (item.text !== undefined && index < node.stack!.length - 1) {
				this.moveDownWithPageBreak(item._paragraphGap ?? 0, item.pageOrientation);
			}
		}, this);
	}

	// section
	processSection(sectionNode: LayoutPdfNode): void {
		const section = sectionNode as SectionNode;

		let page = this.writer.context().getCurrentPage();
		if (!page || (page && page.items.length)) {
			const resolved = resolveSectionPage(section, page, {
				pageSize: this.pageSize,
				pageMargins: this.pageMargins,
			});

			this.writer.addPage(
				resolved.pageSize,
				resolved.pageOrientation,
				resolved.pageMargins,
				resolved.customProperties,
			);
		}

		this.processNode(section.section);
	}

	// columns
	processColumns(columnNode: LayoutPdfNode): void {
		this.nestedLevel++;
		const columns = columnNode.columns!;
		let availableWidth = this.writer.context().availableWidth;
		let gaps = gapArray(columnNode._gap ?? 0);

		if (gaps) {
			availableWidth -= (gaps.length - 1) * (columnNode._gap ?? 0);
		}

		ColumnCalculator.buildColumnWidths(columns, availableWidth);
		let result = this.processRow({
			marginX: columnNode._margin ? [columnNode._margin[0], columnNode._margin[2]] : [0, 0],
			cells: columns,
			widths: columns,
			gaps,
			snakingColumns: columnNode.snakingColumns,
		});
		addAll(columnNode.positions!, result.positions);
		this.nestedLevel--;
		if (this.nestedLevel === 0) {
			this.writer.context().resetMarginXTopParent();
		}
		function gapArray(gap: number): number[] | null {
			if (!gap) {
				return null;
			}

			const gaps: number[] = [];
			gaps.push(0);

			for (let i = columns.length - 1; i > 0; i--) {
				gaps.push(gap);
			}

			return gaps;
		}
	}
}

export default LayoutBuilder;
