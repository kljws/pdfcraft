import type PageElementWriter from "./element-writer.page";
import type { ColumnWidth, LayoutPdfNode, Position } from "../types/internal";
import { addAll } from "./layout-builder.helpers";
import {
	columnLeftOffset,
	findStartingRowSpanCell,
	getRowSpanEndingCell,
	storePageBreakData,
	updatePageBreaksData,
	type TablePageBreak,
} from "./layout-builder.table";
import { processTable as processTableContent } from "./layout-builder.table-processing";

export interface VerticalAlignmentStackEntry {
	begin: { item: LayoutPdfNode };
	end: { item: LayoutPdfNode };
}

export interface ProcessRowOptions {
	marginX?: [number, number];
	dontBreakRows?: boolean;
	rowsWithoutPageBreak?: number;
	cells: LayoutPdfNode[];
	widths: ColumnWidth[];
	gaps: number[] | null;
	tableNode?: LayoutPdfNode;
	tableBody?: LayoutPdfNode[][];
	rowIndex?: number;
	height?: number;
	snakingColumns?: boolean;
}

export interface ProcessRowResult {
	pageBreaksBySpan: TablePageBreak[];
	pageBreaks: TablePageBreak[];
	positions: Position[];
}

interface LayoutBuilderRowsHost {
	writer: PageElementWriter;
	nestedLevel: number;
	verticalAlignmentItemStack: VerticalAlignmentStackEntry[];
	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void;
	snakingAwarePageBreak(pageOrientation?: string): void;
}

class LayoutBuilderRows {
	constructor(private readonly host: LayoutBuilderRowsHost) {}

	get writer(): PageElementWriter {
		return this.host.writer;
	}

	get nestedLevel(): number {
		return this.host.nestedLevel;
	}

	set nestedLevel(value: number) {
		this.host.nestedLevel = value;
	}

	get verticalAlignmentItemStack(): VerticalAlignmentStackEntry[] {
		return this.host.verticalAlignmentItemStack;
	}

	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void {
		this.host.processNode(node, isVerticalAlignmentAllowed);
	}

	snakingAwarePageBreak(pageOrientation?: string): void {
		this.host.snakingAwarePageBreak(pageOrientation);
	}

	processRow({
		marginX = [0, 0],
		dontBreakRows = false,
		rowsWithoutPageBreak = 0,
		cells,
		widths,
		gaps,
		tableNode,
		tableBody,
		rowIndex,
		height,
		snakingColumns = false,
	}: ProcessRowOptions): ProcessRowResult {
		tableBody ??= [cells];
		rowIndex ??= 0;
		const isUnbreakableRow = dontBreakRows || rowIndex <= rowsWithoutPageBreak - 1;
		const pageBreaks: TablePageBreak[] = [];
		const pageBreaksByRowSpan: TablePageBreak[] = [];
		const positions: Position[] = [];
		let willBreakByHeight = false;
		const verticalAlignmentCells: Record<number, number> = {};
		const resolvedWidths = widths;

		// Check if row should break by height
		if (!isUnbreakableRow && (height ?? 0) > this.writer.context().availableHeight) {
			willBreakByHeight = true;
		}

		// Use the marginX if we are in a top level table/column (not nested)
		const marginXParent = this.nestedLevel === 1 ? marginX : null;
		const _bottomByPage = tableNode?._bottomByPage;
		// Pass column gap and widths to context snapshot for snaking columns
		// to advance correctly and reset to first-column width on new pages.
		const columnGapForGroup = gaps && gaps.length > 1 ? gaps[1] : 0;
		const columnWidthsForContext = resolvedWidths.map(
			(width) => width._calcWidth ?? width._minWidth,
		);
		this.writer
			.context()
			.beginColumnGroup(
				marginXParent,
				_bottomByPage,
				snakingColumns,
				columnGapForGroup,
				columnWidthsForContext,
			);

		// IMPORTANT: We iterate ALL columns even when snakingColumns is enabled.
		// This is intentional — beginColumn() must be called for each column to set up
		// proper geometry (widths, offsets) and rowspan/colspan tracking. The
		// completeColumnGroup() call at the end depends on this bookkeeping to compute
		// heights correctly. Content processing is skipped for columns > 0 via
		// skipForSnaking below, but the column structure must still be established.
		for (let i = 0, l = cells.length; i < l; i++) {
			let cell = cells[i];
			let cellIndexBegin = i;

			// Page change handler
			const storePageBreakClosure = (data: TablePageBreak) => {
				const startsRowSpan = cell.rowSpan && cell.rowSpan > 1;
				if (startsRowSpan) {
					data.rowSpan = cell.rowSpan;
				}
				data.rowIndex = rowIndex;
				storePageBreakData(data, Boolean(startsRowSpan), pageBreaks, tableNode);
			};

			this.writer.addListener("pageChanged", storePageBreakClosure);

			let width = resolvedWidths[i]._calcWidth ?? resolvedWidths[i]._minWidth;
			let leftOffset = columnLeftOffset(i, gaps);
			// Check if exists and retrieve the cell that started the rowspan in case we are in the cell just after
			let startingSpanCell = findStartingRowSpanCell(cells, i);

			if (cell.colSpan && cell.colSpan > 1) {
				for (let j = 1; j < cell.colSpan; j++) {
					const spannedWidth = resolvedWidths[++i];
					width += (spannedWidth._calcWidth ?? spannedWidth._minWidth) + (gaps?.[i] ?? 0);
				}
			}

			// if rowspan starts in this cell, we retrieve the last cell affected by the rowspan
			const rowSpanRightEndingCell = getRowSpanEndingCell(tableBody, rowIndex, cell, i);
			const rowSpanLeftEndingCell = getRowSpanEndingCell(tableBody, rowIndex, cell, cellIndexBegin);
			if (rowSpanRightEndingCell) {
				// We store a reference of the ending cell in the first cell of the rowspan
				cell._endingCell = rowSpanRightEndingCell;
				cell._endingCell._startingRowSpanY = cell._startingRowSpanY;
				cell._endingCell._startingRowSpanPage = cell._startingRowSpanPage;
			}
			if (rowSpanLeftEndingCell) {
				// We store a reference of the left ending cell in the first cell of the rowspan
				cell._leftEndingCell = rowSpanLeftEndingCell;
				cell._leftEndingCell._startingRowSpanY = cell._startingRowSpanY;
				cell._leftEndingCell._startingRowSpanPage = cell._startingRowSpanPage;
			}

			// If we are after a cell that started a rowspan
			let endOfRowSpanCell = null;
			if (startingSpanCell && startingSpanCell._endingCell) {
				// Reference to the last cell of the rowspan
				endOfRowSpanCell = startingSpanCell._endingCell;
				// Store if we are in an unbreakable block when we save the context and the originalX
				if (this.writer.transactionLevel > 0) {
					endOfRowSpanCell._isUnbreakableContext = true;
					endOfRowSpanCell._originalXOffset = this.writer.originalX;
				}
			}

			// We pass the endingSpanCell reference to store the context just after processing rowspan cell
			this.writer.context().beginColumn(width, leftOffset, endOfRowSpanCell);

			// When snaking, only process content from the first column (i === 0).
			// Content overflows into subsequent columns via moveToNextColumn().
			// We skip content processing here but NOT the beginColumn() call above —
			// the column geometry setup is still needed for proper layout bookkeeping.
			const skipForSnaking = snakingColumns && i > 0;

			if (!cell._span && !skipForSnaking) {
				this.processNode(cell, true);
				this.writer.context().updateBottomByPage();

				if (cell.verticalAlignment) {
					verticalAlignmentCells[cellIndexBegin] = this.verticalAlignmentItemStack.length - 1;
				}

				addAll(positions, cell.positions!);
			} else if (cell._columnEndingContext) {
				let discountY = 0;
				if (dontBreakRows) {
					// Calculate how many points we have to discount to Y when dontBreakRows and rowSpan are combined
					const ctxBeforeRowSpanLastRow =
						this.writer.contextStack[this.writer.contextStack.length - 1];
					const startsOnCurrentPage =
						typeof cell._startingRowSpanPage === "number" &&
						cell._startingRowSpanPage === ctxBeforeRowSpanLastRow.page;

					if (startsOnCurrentPage && typeof cell._startingRowSpanY === "number") {
						discountY = ctxBeforeRowSpanLastRow.y - cell._startingRowSpanY;
					}

					// Do not increase Y by applying a negative discount.
					discountY = Math.max(0, discountY);
				}
				let originalXOffset = 0;
				// If context was saved from an unbreakable block and we are not in an unbreakable block anymore
				// We have to sum the originalX (X before starting unbreakable block) to X
				if (cell._isUnbreakableContext && !this.writer.transactionLevel) {
					originalXOffset = cell._originalXOffset ?? 0;
				}
				// row-span ending
				// Recover the context after processing the rowspanned cell
				this.writer.context().markEnding(cell, originalXOffset, discountY);
			}
			this.writer.removeListener("pageChanged", storePageBreakClosure);
		}

		// Check if last cell is part of a span
		let endingSpanCell = null;
		const lastColumn = cells.length > 0 ? cells[cells.length - 1] : null;
		if (lastColumn) {
			// Previous column cell has a rowspan
			if (lastColumn._endingCell) {
				endingSpanCell = lastColumn._endingCell;
				// Previous column cell is part of a span
			} else if (lastColumn._span === true) {
				// We get the cell that started the span where we set a reference to the ending cell
				const startingSpanCell = findStartingRowSpanCell(cells, cells.length);
				if (startingSpanCell) {
					// Context will be stored here (ending cell)
					endingSpanCell = startingSpanCell._endingCell;
					// Store if we are in an unbreakable block when we save the context and the originalX
					if (endingSpanCell && this.writer.transactionLevel > 0) {
						endingSpanCell._isUnbreakableContext = true;
						endingSpanCell._originalXOffset = this.writer.originalX;
					}
				}
			}
		}

		// If content did not break page, check if we should break by height
		if (willBreakByHeight && !isUnbreakableRow && pageBreaks.length === 0) {
			this.writer.context().moveDown(this.writer.context().availableHeight);
			if (snakingColumns) {
				this.snakingAwarePageBreak();
			} else {
				this.writer.moveToNextPage();
			}
		}

		const bottomByPage = this.writer.context().completeColumnGroup(height ?? 0, endingSpanCell);

		if (tableNode) {
			tableNode._bottomByPage = bottomByPage;
			// If there are page breaks in this row, update data with prevY of last cell
			updatePageBreaksData(pageBreaks, tableNode, rowIndex);
		}

		let rowHeight = this.writer.context().height;
		for (let i = 0, l = cells.length; i < l; i++) {
			let cell = cells[i];
			if (!cell._span && cell.verticalAlignment) {
				let itemBegin = this.verticalAlignmentItemStack[verticalAlignmentCells[i]].begin.item;
				itemBegin.viewHeight = rowHeight;
				itemBegin.nodeHeight = cell.__height;
				itemBegin.cell = cell;
				itemBegin.bottomY = this.writer.context().y;
				itemBegin.isCellContentMultiPage = !itemBegin.cell!.positions!.every(
					(item: Position) => item.pageNumber === itemBegin.cell!.positions![0].pageNumber,
				);
				itemBegin.getViewHeight = function (this: LayoutPdfNode): number {
					const cell = this.cell!;
					if (cell._willBreak) {
						return (cell._bottomY ?? 0) - (cell._rowTopPageY ?? 0);
					}

					if (cell.rowSpan && cell.rowSpan > 1) {
						const endingCell = cell._leftEndingCell!;
						if (dontBreakRows) {
							let rowTopPageY =
								(endingCell._startingRowSpanY ?? 0) + (endingCell._rowTopPageYPadding ?? 0);
							return (endingCell._rowTopPageY ?? 0) - rowTopPageY + (endingCell._bottomY ?? 0);
						} else {
							if (cell.positions![0].pageNumber !== endingCell._lastPageNumber) {
								return (this.bottomY ?? 0) - (endingCell._bottomY ?? 0);
							}

							return (this.viewHeight ?? 0) + (endingCell._bottomY ?? 0) - (this.bottomY ?? 0);
						}
					}

					return this.viewHeight ?? 0;
				};
				itemBegin.getNodeHeight = function (this: LayoutPdfNode): number {
					return this.nodeHeight ?? 0;
				};

				let itemEnd = this.verticalAlignmentItemStack[verticalAlignmentCells[i]].end.item;
				itemEnd.isCellContentMultiPage = itemBegin.isCellContentMultiPage;
			}
		}

		return {
			pageBreaksBySpan: pageBreaksByRowSpan,
			pageBreaks: pageBreaks,
			positions: positions,
		};
	}
	processTable(tableNode: LayoutPdfNode): void {
		processTableContent(this, tableNode);
	}

	// leafs (texts)
}

export default LayoutBuilderRows;
