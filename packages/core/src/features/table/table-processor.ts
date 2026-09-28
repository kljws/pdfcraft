import {
	drawHorizontalLine,
	drawVerticalLine,
	type HorizontalLineOptions,
} from "./table-processor.borders";
import ColumnCalculator from "../../layout/column-calculator";
import type PageElementWriter from "../../layout/element-writer.page";
import type { PdfPage, PdfTable, TableOffsets, TableRowGroupRange } from "../../types/internal";
import { isPositiveInteger } from "../../utils/variable-type";
import type { LayoutTableCell, LayoutTableNode } from "./table.types";
import type { TablePageBreak } from "./table-pagination";
import type {
	ResolvedTableLayout,
	RowSpanData,
	TablePageVectorRegistry,
} from "./table-processor.types";
import {
	createRowSpanData,
	getTableInnerContentWidth,
	hasExplicitPageBreak,
	propagateCellBorders,
	requireTable,
	resetTableLayoutState,
} from "./table-processor.helpers";
import { drawTableRowSegment, type TableLinePosition } from "./table-processor.rows";

class TableProcessor {
	tableNode: LayoutTableNode;
	_isCurrentRowUnbreakable = false;
	_currentRowGroup?: TableRowGroupRange<LayoutTableCell> | undefined;
	offsets!: TableOffsets;
	layout!: ResolvedTableLayout;
	headerLayout!: ResolvedTableLayout;
	bodyLayout!: ResolvedTableLayout;
	tableWidth = 0;
	borderRadius = 0;
	roundedTopByPage = new Map<number, number>();
	vectorRegistryByPage = new Map<PdfPage, TablePageVectorRegistry>();
	tableOffset = 0;
	rowSpanData: RowSpanData[] = [];
	rowGroupsByRow: Array<TableRowGroupRange<LayoutTableCell> | undefined> = [];
	cleanUpRepeatables = false;
	headerRows = 0;
	rowsWithoutPageBreak = 0;
	dontBreakRows = false;
	topLineWidth = 0;
	rowPaddingTop = 0;
	bottomLineWidth = 0;
	rowPaddingBottom = 0;
	rowCallback: () => void = () => {};
	_tableTopBorderY?: number | undefined;
	rowTopPageY = 0;
	rowTopY = 0;
	rowXOffset = 0;
	reservedAtBottom = 0;
	headerRepeatable: ReturnType<PageElementWriter["currentBlockToRepeatable"]> | null = null;

	constructor(tableNode: LayoutTableNode) {
		this.tableNode = tableNode;
	}

	/** Column boundary `index`; boundaries exist for every column and the table's right edge. */
	private boundaryAt(index: number): RowSpanData {
		const boundary = this.rowSpanData[index];
		if (!boundary) throw new Error(`Internal layout error: missing table boundary ${index}`);
		return boundary;
	}

	private get table(): PdfTable<LayoutTableCell> {
		return requireTable(this.tableNode);
	}

	beginTable(writer: PageElementWriter): void {
		resetTableLayoutState(this.tableNode);
		const offsets = this.tableNode.metrics.offsets;
		if (!offsets) throw new Error("Internal layout error: table offsets were not measured");
		this.offsets = offsets;
		this.layout = this.tableNode.metrics.layout as ResolvedTableLayout;
		this.headerLayout = (this.tableNode._headerLayout ??
			this.tableNode.metrics.layout) as ResolvedTableLayout;
		this.bodyLayout = (this.tableNode._bodyLayout ??
			this.tableNode.metrics.layout) as ResolvedTableLayout;

		const table = this.table;
		const contextWidth = writer.context().availableWidth;
		const availableWidth = contextWidth - this.offsets.total;
		ColumnCalculator.buildColumnWidths(
			table.widths,
			availableWidth,
			this.offsets.total,
			this.tableNode,
		);
		this.tableWidth = this.offsets.total + getTableInnerContentWidth(this.tableNode);
		this.borderRadius = Math.min(
			Number.isFinite(table.borderRadius) ? Math.max(0, table.borderRadius ?? 0) : 0,
			this.tableWidth / 2,
		);
		this.roundedTopByPage.clear();
		this.vectorRegistryByPage.clear();
		const remainingWidth = Math.max(0, contextWidth - this.tableWidth);
		this.tableOffset =
			this.tableNode._tableAlignment === "right"
				? remainingWidth
				: this.tableNode._tableAlignment === "center"
					? remainingWidth / 2
					: 0;
		this.rowSpanData = createRowSpanData(this.tableNode, this.layout, this.tableOffset);
		this.rowGroupsByRow = Array(table.body.length);
		for (const group of table._rowGroups ?? []) {
			for (let rowIndex = group.startRow; rowIndex <= group.endRow; rowIndex++) {
				this.rowGroupsByRow[rowIndex] = group;
			}
		}
		this.cleanUpRepeatables = false;
		this.headerRows = 0;
		this.rowsWithoutPageBreak = 0;

		if (isPositiveInteger(table.headerRows)) {
			this.headerRows = table.headerRows;
			if (this.headerRows > table.body.length) {
				throw new Error(
					`Too few rows in the table. Property headerRows requires at least ${this.headerRows}, contains only ${table.body.length}`,
				);
			}
			this.rowsWithoutPageBreak = this.headerRows;
			const firstBodyGroup = table._rowGroups?.find((group) => group.startRow === this.headerRows);
			if (firstBodyGroup?.keepTogether) {
				this.rowsWithoutPageBreak = firstBodyGroup.endRow + 1;
			}
			if (isPositiveInteger(table.keepWithHeaderRows)) {
				this.rowsWithoutPageBreak += table.keepWithHeaderRows;
			}
		}
		this.layout = this.headerRows ? this.headerLayout : this.bodyLayout;

		this.dontBreakRows = table.dontBreakRows || false;
		if (this.rowsWithoutPageBreak || this.dontBreakRows) {
			writer.beginUnbreakableBlock();
			this.drawHorizontalLine(0, writer);
			if (this.rowsWithoutPageBreak && this.dontBreakRows) {
				writer.beginUnbreakableBlock();
			}
		}

		propagateCellBorders(table.body);
	}

	beginRow(rowIndex: number, writer: PageElementWriter): void {
		const rowGroup = this.rowGroupsByRow[rowIndex];
		this.selectLayout(rowIndex);
		this._currentRowGroup = rowGroup;
		if (rowGroup?.keepTogether && rowIndex === rowGroup.startRow) {
			writer.beginUnbreakableBlock();
		}

		this.topLineWidth = this.layout.hLineWidth(rowIndex, this.tableNode);
		this.rowPaddingTop = this.layout.paddingTop(rowIndex, this.tableNode);
		this.bottomLineWidth = this.layout.hLineWidth(rowIndex + 1, this.tableNode);
		this.rowPaddingBottom = this.layout.paddingBottom(rowIndex, this.tableNode);
		const context = writer.context();
		const currentPage =
			typeof context.getCurrentPage === "function" ? context.getCurrentPage() : undefined;
		this.rowXOffset = context.x - (currentPage?.pageMargins.left ?? context.pageMargins?.left ?? 0);

		this.rowCallback = () => {
			const offset = this.rowPaddingTop + (!this.headerRows ? this.topLineWidth : 0);
			writer.context().availableHeight -= this.reservedAtBottom;
			writer.context().moveDown(offset);
		};
		writer.addListener("pageChanged", this.rowCallback);
		if (rowIndex === 0 && !this.dontBreakRows && !this.rowsWithoutPageBreak) {
			this._tableTopBorderY = writer.context().y;
			writer.context().moveDown(this.topLineWidth);
		}

		this.rowTopPageY = writer.context().y + this.rowPaddingTop;
		const rowHasPageBreak = this.table.body[rowIndex]?.some(hasExplicitPageBreak) ?? false;
		const rowMustNotBreak = this.dontBreakRows || rowGroup?.dontBreakRows === true;
		this._isCurrentRowUnbreakable =
			rowMustNotBreak && !(this.dontBreakRows && rowIndex === 0) && !rowHasPageBreak;
		if (this._isCurrentRowUnbreakable) writer.beginUnbreakableBlock();

		this.rowTopY = writer.context().y;
		this.reservedAtBottom = this.bottomLineWidth + this.rowPaddingBottom;
		writer.context().availableHeight -= this.reservedAtBottom;
		writer.context().moveDown(this.rowPaddingTop);
	}

	selectLayout(rowIndex: number): void {
		const groupLayout = this.rowGroupsByRow[rowIndex]?.layout as ResolvedTableLayout | undefined;
		this.layout =
			rowIndex < this.headerRows
				? (this.headerLayout ?? this.layout)
				: (groupLayout ?? this.bodyLayout ?? this.layout);
	}

	drawHorizontalLine(
		lineIndex: number,
		writer: PageElementWriter,
		options?: HorizontalLineOptions,
	): void {
		drawHorizontalLine(this, lineIndex, writer, options);
	}

	drawVerticalLine(
		x: number,
		y0: number,
		y1: number,
		vLineColIndex: number,
		writer: PageElementWriter,
		vLineRowIndex: number,
		beforeVLineColIndex: number | null,
		trim?: { top: number; bottom: number },
	): void {
		drawVerticalLine(
			this,
			x,
			y0,
			y1,
			vLineColIndex,
			writer,
			vLineRowIndex,
			beforeVLineColIndex,
			trim,
		);
	}
	endTable(writer: PageElementWriter): void {
		if (this.cleanUpRepeatables) {
			writer.popFromRepeatables();
		}
	}

	endRow(rowIndex: number, writer: PageElementWriter, pageBreaks: TablePageBreak[]): void {
		const getLineXs = () => {
			const result: TableLinePosition[] = [];
			let cols = 0;

			for (const [i, item] of (this.table.body[rowIndex] ?? []).entries()) {
				if (!cols) {
					result.push({ x: this.boundaryAt(i).left, index: i });
					cols = item._colSpan || item.colSpan || 0;
				}
				if (cols > 0) {
					cols--;
				}
			}

			const lastIndex = this.rowSpanData.length - 1;
			result.push({ x: this.boundaryAt(lastIndex).left, index: lastIndex });

			return result;
		};

		writer.removeListener("pageChanged", this.rowCallback);
		writer.context().moveDown(this.layout.paddingBottom(rowIndex, this.tableNode));
		writer.context().availableHeight += this.reservedAtBottom;

		const endingPage = writer.context().page;
		const endingY = writer.context().y;
		const endingAvailableHeight = writer.context().availableHeight;
		const endingX = writer.context().x;
		const endingAvailableWidth = writer.context().availableWidth;

		const xs = getLineXs();

		type RowSegment = { y0: number; y1?: number | undefined; page: number };
		const [firstBreak] = pageBreaks;
		const firstSegment: RowSegment = {
			y0: this.rowTopY,
			page: firstBreak ? firstBreak.prevPage : endingPage,
		};
		const ys: RowSegment[] = [firstSegment];
		let lastSegment = firstSegment;
		for (const pageBreak of pageBreaks) {
			lastSegment.y1 = pageBreak.prevY;
			lastSegment = { y0: pageBreak.y, page: pageBreak.prevPage + 1 };
			ys.push(lastSegment);
		}
		lastSegment.y1 = endingY;

		const firstSegmentEnd = firstSegment.y1;
		if (firstSegmentEnd === undefined) {
			throw new Error("Internal layout error: table row segment has no ending position");
		}
		const skipOrphanePadding = firstSegmentEnd - firstSegment.y0 === this.rowPaddingTop;
		if (skipOrphanePadding && firstBreak && this.layout.hLineWhenBroken !== false) {
			this.drawHorizontalLine(rowIndex, writer, {
				overrideY: firstBreak.prevY,
				moveDown: false,
				forcePage: firstBreak.prevPage,
				styleLineIndex: this.table.body.length,
				borderSide: "bottom",
			});
		}
		if (
			rowIndex === 0 &&
			!skipOrphanePadding &&
			!this.rowsWithoutPageBreak &&
			!this.dontBreakRows
		) {
			// Draw the top border of the table
			// The page where the table started
			const pageTableStartedAt = firstBreak?.prevPage;
			this.drawHorizontalLine(0, writer, {
				overrideY: this._tableTopBorderY,
				moveDown: false,
				forcePage: pageTableStartedAt,
			});
		}
		for (const [yi, segment] of ys.entries()) {
			if (skipOrphanePadding && yi === 0) continue;
			const willBreak = yi < ys.length - 1;
			const rowBreakWithoutHeader = yi > 0 && !this.headerRows;
			const hzLineOffset = rowBreakWithoutHeader ? 0 : this.topLineWidth;
			const y1 = segment.y0;
			let y2 = segment.y1;
			if (y2 === undefined) {
				throw new Error("Internal layout error: table row segment has no ending position");
			}

			if (willBreak) {
				y2 = y2 + this.rowPaddingBottom;
			}

			if (writer.context().page != segment.page) {
				writer.context().page = segment.page;
			}
			const segmentContext = writer.context();
			const segmentPage =
				typeof segmentContext.getCurrentPage === "function"
					? segmentContext.getCurrentPage()
					: segmentContext.pages?.[segmentContext.page];
			if (segmentPage) {
				segmentContext.pageMargins = segmentPage.pageMargins;
				segmentContext.x = segmentPage.pageMargins.left + this.rowXOffset;
				segmentContext.availableWidth =
					segmentPage.pageSize.width - segmentContext.x - segmentPage.pageMargins.right;
			}

			// Draw horizontal lines before the vertical lines so they are not overridden
			if (willBreak && this.layout.hLineWhenBroken !== false) {
				this.drawHorizontalLine(rowIndex + 1, writer, {
					overrideY: y2,
					moveDown: false,
					styleLineIndex: this.table.body.length,
					borderSide: "bottom",
				});
			}
			if (rowBreakWithoutHeader && this.layout.hLineWhenBroken !== false) {
				this.drawHorizontalLine(rowIndex, writer, {
					overrideY: y1,
					moveDown: false,
					styleLineIndex: 0,
					borderSide: "top",
				});
			}
			const roundedTopY = this.roundedTopByPage.get(segment.page);
			const segmentTopY = y1 - hzLineOffset + this.topLineWidth / 2;
			const startsRoundedPageFragment =
				roundedTopY !== undefined && Math.abs(roundedTopY - segmentTopY) < 0.001;

			drawTableRowSegment(this, rowIndex, writer, xs, {
				y1,
				y2,
				willBreak,
				horizontalLineOffset: hzLineOffset,
				roundTop:
					(rowIndex === 0 && yi === (skipOrphanePadding ? 1 : 0)) || startsRoundedPageFragment,
				roundBottom:
					(willBreak && this.layout.hLineWhenBroken !== false) ||
					(rowIndex === this.table.body.length - 1 && !willBreak && yi === ys.length - 1),
			});
		}

		writer.context().page = endingPage;
		writer.context().y = endingY;
		writer.context().availableHeight = endingAvailableHeight;
		writer.context().x = endingX;
		writer.context().availableWidth = endingAvailableWidth;
		const restoredPage =
			typeof writer.context().getCurrentPage === "function"
				? writer.context().getCurrentPage()
				: writer.context().pages?.[writer.context().page];
		if (restoredPage) writer.context().pageMargins = restoredPage.pageMargins;

		for (const [i, cell] of (this.table.body[rowIndex] ?? []).entries()) {
			const boundary = this.boundaryAt(i);
			const rowSpan = cell.rowSpan ?? 0;
			if (rowSpan) {
				boundary.rowSpan = rowSpan;

				// fix colSpans
				if (cell.colSpan && cell.colSpan > 1) {
					for (let j = 1; j < rowSpan; j++) {
						const spanned = this.table.body[rowIndex + j]?.[i];
						if (spanned) spanned._colSpan = cell.colSpan;
					}
				}

				// fix rowSpans
				if (rowSpan > 1) {
					for (let j = 1; j < rowSpan; j++) {
						const spanned = this.table.body[rowIndex + j]?.[i];
						if (spanned) spanned._rowSpanCurrentOffset = j;
					}
				}
			}

			if (boundary.rowSpan > 0) {
				boundary.rowSpan--;
			}
		}

		this.drawHorizontalLine(rowIndex + 1, writer);

		if (this.headerRows && rowIndex === this.headerRows - 1) {
			this.headerRepeatable = writer.currentBlockToRepeatable();
		}

		const shouldCommitCurrentRowUnbreakable =
			(this.dontBreakRows && rowIndex === 0) || this._isCurrentRowUnbreakable;

		if (shouldCommitCurrentRowUnbreakable) {
			const pageChangedCallback = (change: TablePageBreak) => {
				if (rowIndex > 0 && this.layout.hLineWhenBroken !== false) {
					this.drawHorizontalLine(rowIndex, writer, {
						overrideY: change.prevY,
						moveDown: false,
						forcePage: change.prevPage,
						styleLineIndex: this.table.body.length,
						borderSide: "bottom",
					});
					if (!this.headerRows) {
						// Draw the top border of the row after a page break.
						this.drawHorizontalLine(rowIndex, writer, { styleLineIndex: 0, borderSide: "top" });
					}
				}
			};

			writer.addListener("pageChanged", pageChangedCallback);

			writer.commitUnbreakableBlock();

			writer.removeListener("pageChanged", pageChangedCallback);
		}

		this._isCurrentRowUnbreakable = false;

		if (this._currentRowGroup?.keepTogether && rowIndex === this._currentRowGroup.endRow) {
			const groupStartRow = this._currentRowGroup.startRow;
			const pageChangedCallback = (change: TablePageBreak) => {
				if (groupStartRow > 0 && this.layout.hLineWhenBroken !== false) {
					this.drawHorizontalLine(groupStartRow, writer, {
						overrideY: change.prevY,
						moveDown: false,
						forcePage: change.prevPage,
						styleLineIndex: this.table.body.length,
						borderSide: "bottom",
					});
					if (!this.headerRows) {
						this.drawHorizontalLine(groupStartRow, writer, {
							styleLineIndex: 0,
							borderSide: "top",
						});
					}
				}
			};

			writer.addListener("pageChanged", pageChangedCallback);
			writer.commitUnbreakableBlock();
			writer.removeListener("pageChanged", pageChangedCallback);
		}
		this._currentRowGroup = undefined;

		if (
			this.headerRepeatable &&
			(rowIndex === this.rowsWithoutPageBreak - 1 || rowIndex === this.table.body.length - 1)
		) {
			writer.commitUnbreakableBlock();
			writer.pushToRepeatables(this.headerRepeatable);
			this.cleanUpRepeatables = true;
			this.headerRepeatable = null;
		}
	}
}

export default TableProcessor;
