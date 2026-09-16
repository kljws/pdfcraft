import type PageElementWriter from "../../layout/element-writer.page";
import type { PageOrientation } from "../../types";
import type { ColumnWidth, LayoutPdfNode, Position } from "../../types/internal";
import {
	columnLeftOffset,
	findStartingRowSpanCell,
	getRowSpanEndingCell,
	storePageBreakData,
	updatePageBreaksData,
	type TablePageBreak,
} from "./table-pagination";
import type { VerticalAlignmentStackEntry } from "../../engine/layout-node-lifecycle";

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
	pageBreaks: TablePageBreak[];
	positions: Position[];
}

export interface TableRowLayoutHost {
	writer: PageElementWriter;
	nestedLevel: number;
	verticalAlignmentItemStack: VerticalAlignmentStackEntry[];
	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void;
	snakingAwarePageBreak(pageOrientation?: PageOrientation): void;
}

class TableRowLayout {
	constructor(private readonly host: TableRowLayoutHost) {}

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
		const positions: Position[] = [];
		let willBreakByHeight = false;
		const verticalAlignmentCells: Record<number, number> = {};
		const resolvedWidths = widths;

		// Fixed-height rows that fit a fresh page are moved before beginRow so the
		// table processor can draw complete borders. Only oversized rows reach this fallback.
		if (!isUnbreakableRow && (height ?? 0) > this.host.writer.context().availableHeight) {
			willBreakByHeight = true;
		}

		// Use the marginX if we are in a top level table/column (not nested)
		const marginXParent = this.host.nestedLevel === 1 ? marginX : null;
		const _bottomByPage = tableNode?._bottomByPage;
		// Pass column gap and widths to context snapshot for snaking columns
		// to advance correctly and reset to first-column width on new pages.
		const columnGapForGroup = gaps && gaps.length > 1 ? gaps[1] : 0;
		const columnWidthsForContext = resolvedWidths.map(
			(width) => width._calcWidth ?? width._minWidth,
		);
		this.host.writer
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
			const cell = cells[i];
			const cellIndexBegin = i;

			// Page change handler
			const storePageBreakClosure = (data: TablePageBreak) => {
				const startsRowSpan = cell.rowSpan && cell.rowSpan > 1;
				if (startsRowSpan) {
					data.rowSpan = cell.rowSpan;
				}
				data.rowIndex = rowIndex;
				storePageBreakData(data, Boolean(startsRowSpan), pageBreaks, tableNode);
			};

			this.host.writer.addListener("pageChanged", storePageBreakClosure);

			const resolvedWidth = resolvedWidths[i];
			if (!resolvedWidth) {
				throw new Error(`Internal layout error: missing measured width for table column ${i}`);
			}
			let width = resolvedWidth._calcWidth ?? resolvedWidth._minWidth;
			const leftOffset = columnLeftOffset(i, gaps);
			// Check if exists and retrieve the cell that started the rowspan in case we are in the cell just after
			const startingSpanCell = findStartingRowSpanCell(cells, i);

			if (cell.colSpan && cell.colSpan > 1) {
				for (let j = 1; j < cell.colSpan; j++) {
					const spannedWidth = resolvedWidths[++i];
					if (!spannedWidth) {
						throw new Error(`Internal layout error: missing measured width for table column ${i}`);
					}
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
				if (this.host.writer.transactionLevel > 0) {
					endOfRowSpanCell._isUnbreakableContext = true;
					endOfRowSpanCell._originalXOffset = this.host.writer.originalX;
				}
			}

			// We pass the endingSpanCell reference to store the context just after processing rowspan cell
			this.host.writer.context().beginColumn(width, leftOffset, endOfRowSpanCell);

			// When snaking, only process content from the first column (i === 0).
			// Content overflows into subsequent columns via moveToNextColumn().
			// We skip content processing here but NOT the beginColumn() call above —
			// the column geometry setup is still needed for proper layout bookkeeping.
			const skipForSnaking = snakingColumns && i > 0;

			if (!cell._span && !skipForSnaking) {
				this.host.processNode(cell, true);
				this.host.writer.context().updateBottomByPage();

				if (cell.verticalAlignment) {
					verticalAlignmentCells[cellIndexBegin] = this.host.verticalAlignmentItemStack.length - 1;
				}

				positions.push(...(cell.positions ?? []));
			} else if (cell._columnEndingContext) {
				let discountY = 0;
				if (dontBreakRows) {
					// Calculate how many points we have to discount to Y when dontBreakRows and rowSpan are combined
					const ctxBeforeRowSpanLastRow =
						this.host.writer.contextStack[this.host.writer.contextStack.length - 1];
					if (!ctxBeforeRowSpanLastRow) {
						throw new Error("Internal layout error: missing row-span transaction context");
					}
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
				if (cell._isUnbreakableContext && !this.host.writer.transactionLevel) {
					originalXOffset = cell._originalXOffset ?? 0;
				}
				// row-span ending
				// Recover the context after processing the rowspanned cell
				this.host.writer.context().markEnding(cell, originalXOffset, discountY);
			}
			this.host.writer.removeListener("pageChanged", storePageBreakClosure);
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
					if (endingSpanCell && this.host.writer.transactionLevel > 0) {
						endingSpanCell._isUnbreakableContext = true;
						endingSpanCell._originalXOffset = this.host.writer.originalX;
					}
				}
			}
		}

		// If content did not break page, check if we should break by height
		if (willBreakByHeight && !isUnbreakableRow && pageBreaks.length === 0) {
			this.host.writer.context().moveDown(this.host.writer.context().availableHeight);
			if (snakingColumns) {
				this.host.snakingAwarePageBreak();
			} else {
				this.host.writer.moveToNextPage();
			}
		}

		const bottomByPage = this.host.writer
			.context()
			.completeColumnGroup(height ?? 0, endingSpanCell);

		if (tableNode) {
			tableNode._bottomByPage = bottomByPage;
			// If there are page breaks in this row, update data with prevY of last cell
			updatePageBreaksData(pageBreaks, tableNode, rowIndex);
		}

		const rowHeight = this.host.writer.context().height;
		for (let i = 0, l = cells.length; i < l; i++) {
			const cell = cells[i];
			if (!cell._span && cell.verticalAlignment) {
				const alignmentEntry = this.host.verticalAlignmentItemStack[verticalAlignmentCells[i]];
				if (!alignmentEntry) {
					throw new Error(
						`Internal layout error: missing vertical-alignment controls for table cell ${i}`,
					);
				}
				const itemBegin = alignmentEntry.begin.item;
				itemBegin.viewHeight = rowHeight;
				itemBegin.nodeHeight = cell.__height;
				itemBegin.cell = cell;
				itemBegin.bottomY = this.host.writer.context().y;
				const cellPositions = cell.positions ?? [];
				const firstPageNumber = cellPositions[0]?.pageNumber;
				itemBegin.isCellContentMultiPage = cellPositions.some(
					(item: Position) => item.pageNumber !== firstPageNumber,
				);
				itemBegin.getViewHeight = function (this: LayoutPdfNode): number {
					const cell = this.cell;
					if (!cell)
						throw new Error("Internal layout error: missing vertically aligned table cell");
					if (cell._willBreak) {
						return (cell._bottomY ?? 0) - (cell._rowTopPageY ?? 0);
					}

					if (cell.rowSpan && cell.rowSpan > 1) {
						const endingCell = cell._leftEndingCell;
						if (!endingCell) {
							throw new Error("Internal layout error: missing row-span ending cell");
						}
						if (dontBreakRows) {
							const rowTopPageY =
								(endingCell._startingRowSpanY ?? 0) + (endingCell._rowTopPageYPadding ?? 0);
							return (endingCell._rowTopPageY ?? 0) - rowTopPageY + (endingCell._bottomY ?? 0);
						} else {
							if (cell._lastPageNumber !== endingCell._lastPageNumber) {
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

				const itemEnd = alignmentEntry.end.item;
				itemEnd.isCellContentMultiPage = itemBegin.isCellContentMultiPage;
			}
		}

		return {
			pageBreaks: pageBreaks,
			positions: positions,
		};
	}
	// leafs (texts)
}

export default TableRowLayout;
