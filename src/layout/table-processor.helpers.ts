import { PAGE_BREAK_VALUES } from "./table-processor.constants";
import type { ColumnWidth, LayoutPdfNode } from "../types/internal";
import type { ResolvedTableLayout, RowSpanData } from "./table-processor.types";

export const hasExplicitPageBreak = (cell: LayoutPdfNode): boolean => {
	if (!cell || typeof cell !== "object") {
		return false;
	}

	return typeof cell.pageBreak === "string" && PAGE_BREAK_VALUES.has(cell.pageBreak);
};

export const getTableInnerContentWidth = (tableNode: LayoutPdfNode): number =>
	tableNode.table!.widths.reduce((width: number, column: ColumnWidth) => {
		return width + (column._calcWidth ?? column._minWidth);
	}, 0);

export const createRowSpanData = (
	tableNode: LayoutPdfNode,
	layout: ResolvedTableLayout,
	horizontalOffset = 0,
): RowSpanData[] => {
	const data: RowSpanData[] = [{ left: horizontalOffset, rowSpan: 0 }];
	let left = horizontalOffset;
	const table = tableNode.table!;

	for (let index = 0; index < table.body[0].length; index++) {
		const padding = layout.paddingLeft(index, tableNode) + layout.paddingRight(index, tableNode);
		const width =
			padding + layout.vLineWidth(index, tableNode) + (table.widths[index]._calcWidth ?? 0);
		data[data.length - 1].width = width;
		left += width;
		data.push({ left, rowSpan: 0, width: 0 });
	}

	return data;
};

export const propagateCellBorders = (body: LayoutPdfNode[][]): void => {
	const setBorder = (
		rowIndex: number,
		columnIndex: number,
		borderIndex: number,
		value: boolean,
	): void => {
		const cell = body[rowIndex][columnIndex];
		cell.border ||= [true, true, true, true];
		cell.border[borderIndex] = value;
	};

	for (let rowIndex = 0; rowIndex < body.length; rowIndex++) {
		for (let columnIndex = 0; columnIndex < body[rowIndex].length; columnIndex++) {
			const cell = body[rowIndex][columnIndex];
			if (!cell.border) continue;

			const rowSpan = cell.rowSpan || 1;
			const columnSpan = cell.colSpan || 1;
			for (let rowOffset = 0; rowOffset < rowSpan; rowOffset++) {
				if (cell.border[0] !== undefined && rowOffset > 0) {
					setBorder(rowIndex + rowOffset, columnIndex, 0, cell.border[0]);
				}
				if (cell.border[2] !== undefined) {
					setBorder(rowIndex + rowOffset, columnIndex + columnSpan - 1, 2, cell.border[2]);
				}
			}

			for (let columnOffset = 0; columnOffset < columnSpan; columnOffset++) {
				if (cell.border[1] !== undefined && columnOffset > 0) {
					setBorder(rowIndex, columnIndex + columnOffset, 1, cell.border[1]);
				}
				if (cell.border[3] !== undefined) {
					setBorder(rowIndex + rowSpan - 1, columnIndex + columnOffset, 3, cell.border[3]);
				}
			}
		}
	}
};
