import type PageElementWriter from "../../layout/element-writer.page";
import type { ColumnWidth, Position } from "../../types/internal";
import {
	columnLeftOffset,
	findStartingRowSpanCell,
	getRowSpanEndingCell,
	storePageBreakData,
	updatePageBreaksData,
} from "./table-pagination";
import {
	completeVerticalAlignment,
	type VerticalAlignmentControls,
} from "../../engine/layout-node-lifecycle";
import type { EndingCell, LayoutTableCell, TablePageBreak } from "./table.types";

export type ProcessRowOptions = {
	marginX?: [number, number] | undefined;
	dontBreakRows?: boolean | undefined;
	rowsWithoutPageBreak?: number | undefined;
	cells: LayoutTableCell[];
	widths: ColumnWidth[];
	gaps: number[] | null;
	tableNode?: LayoutTableCell | undefined;
	tableBody?: LayoutTableCell[][] | undefined;
	rowIndex?: number | undefined;
	height?: number | undefined;
};

export type ProcessRowResult = {
	pageBreaks: TablePageBreak[];
	positions: Position[];
};

export type TableRowLayoutHost = {
	readonly writer: PageElementWriter;
	readonly nestedLevel: number;
	processNode(
		node: LayoutTableCell,
		isVerticalAlignmentAllowed?: boolean,
	): VerticalAlignmentControls | undefined;
};

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
	}: ProcessRowOptions): ProcessRowResult {
		tableBody ??= [cells];
		rowIndex ??= 0;
		const isUnbreakableRow = dontBreakRows || rowIndex <= rowsWithoutPageBreak - 1;
		const pageBreaks: TablePageBreak[] = [];
		const positions: Position[] = [];
		let willBreakByHeight = false;
		const alignedCells: Array<{ cell: LayoutTableCell; controls: VerticalAlignmentControls }> = [];
		const resolvedWidths = widths;

		// Fixed-height rows that fit a fresh page are moved before beginRow so the
		// table processor can draw complete borders. Only oversized rows reach this fallback.
		if (!isUnbreakableRow && (height ?? 0) > this.host.writer.context().availableHeight) {
			willBreakByHeight = true;
		}

		// Use the marginX if we are in a top level table (not nested)
		const marginXParent = this.host.nestedLevel === 1 ? marginX : null;
		this.host.writer.context().beginColumnGroup(marginXParent, tableNode?._bottomByPage);

		for (let i = 0, l = cells.length; i < l; i++) {
			const cell = cells[i];
			// The loop advances `i` past spanned columns itself, so it stays index-based.
			if (!cell) continue;
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
			let endOfRowSpanCell: EndingCell | null = null;
			if (startingSpanCell && startingSpanCell._endingCell) {
				// Reference to the last cell of the rowspan
				endOfRowSpanCell = startingSpanCell._endingCell;
				// Store if we are in an unbreakable block when we save the context and the originalX
				if (this.host.writer.transactionLevel > 0) {
					endOfRowSpanCell._isUnbreakableContext = true;
					endOfRowSpanCell._originalXOffset = this.host.writer.originalX;
				}
			}

			// The context just after the rowspanned cell is stored in its ending cell instead of
			// contributing to the bottom of this row.
			const context = this.host.writer.context();
			if (endOfRowSpanCell) {
				endOfRowSpanCell._columnEndingContext = context.captureCoordinates();
				context.beginColumn(width, leftOffset, false);
			} else {
				context.beginColumn(width, leftOffset);
			}

			if (!cell._span) {
				const controls = this.host.processNode(cell, true);
				this.host.writer.context().updateBottomByPage();

				if (cell.verticalAlignment) {
					if (!controls) {
						throw new Error(
							`Internal layout error: missing vertical-alignment controls for table cell ${cellIndexBegin}`,
						);
					}
					alignedCells.push({ cell, controls });
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
				this.host.writer
					.context()
					.restoreCoordinates(cell._columnEndingContext, originalXOffset, discountY);
			}
			this.host.writer.removeListener("pageChanged", storePageBreakClosure);
		}

		// Check if last cell is part of a span
		let endingSpanCell: EndingCell | null | undefined = null;
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
			this.host.writer.moveToNextPage();
		}

		const endContext = this.host.writer.context();
		if (endingSpanCell) endingSpanCell._columnEndingContext = endContext.captureCoordinates();
		const bottomByPage = endContext.completeColumnGroup(height ?? 0, !endingSpanCell);

		if (tableNode) {
			tableNode._bottomByPage = bottomByPage;
			// If there are page breaks in this row, update data with prevY of last cell
			updatePageBreaksData(pageBreaks, tableNode, rowIndex);
		}

		const rowHeight = this.host.writer.context().height;
		const bottomY = this.host.writer.context().y;
		for (const { cell, controls } of alignedCells) {
			const cellPositions = cell.positions ?? [];
			const firstPageNumber = cellPositions[0]?.pageNumber;
			const nodeHeight = cell.__height ?? 0;
			completeVerticalAlignment(controls, {
				isContentMultiPage: cellPositions.some(
					(item: Position) => item.pageNumber !== firstPageNumber,
				),
				getNodeHeight: () => nodeHeight,
				// Read when the page is rendered, after the table processor finished the row.
				getViewHeight: () => {
					if (cell._willBreak) {
						return (cell._bottomY ?? 0) - (cell._rowTopPageY ?? 0);
					}

					if (cell.rowSpan && cell.rowSpan > 1) {
						const endingCell = cell._leftEndingCell;
						if (!endingCell) {
							throw new Error("Internal layout error: missing row-span ending cell");
						}
						if (dontBreakRows) {
							const rowTopPageY = endingCell._startingRowSpanY ?? 0;
							return (endingCell._rowTopPageY ?? 0) - rowTopPageY + (endingCell._bottomY ?? 0);
						}
						if (cell._lastPageNumber !== endingCell._lastPageNumber) {
							return bottomY - (endingCell._bottomY ?? 0);
						}
						return rowHeight + (endingCell._bottomY ?? 0) - bottomY;
					}

					return rowHeight;
				},
			});
		}

		return {
			pageBreaks: pageBreaks,
			positions: positions,
		};
	}
}

export default TableRowLayout;
