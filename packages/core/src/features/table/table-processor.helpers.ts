import ColumnCalculator from "../../layout/column-calculator";
import { trackVectorInsertion } from "../../layout/vector-insertion";
import type { ColumnWidth, PdfPage, Vector } from "../../types/internal";
import type { LayoutTableCell, LayoutTableNode, PdfTable } from "./table.types";
import type {
	ResolvedTableLayout,
	RowSpanData,
	TablePageVectorRegistry,
} from "./table-processor.types";
import type TableProcessor from "./table-processor";

const pageBreakValues = new Set([
	"before",
	"beforeOdd",
	"beforeEven",
	"after",
	"afterOdd",
	"afterEven",
]);

export type TableVectorRole =
	| "horizontal"
	| "leftVertical"
	| "rightVertical"
	| "leftFill"
	| "rightFill";

export const requireTable = (tableNode: LayoutTableNode): PdfTable<LayoutTableCell> => {
	const table = tableNode.table;
	if (!table) throw new Error("Internal layout error: expected a preprocessed table node");
	return table;
};

export function resetTableLayoutState(tableNode: LayoutTableNode): void {
	delete tableNode._breaksBySpan;
	delete tableNode._bottomByPage;
	for (const row of requireTable(tableNode).body) {
		for (const cell of row) {
			delete cell._bottomY;
			delete cell._originalXOffset;
			delete cell._columnEndingContext;
			delete cell._endingCell;
			delete cell._leftEndingCell;
			delete cell._startingRowSpanY;
			delete cell._startingRowSpanPage;
			delete cell._rowTopPageY;
			delete cell._willBreak;
			delete cell._isUnbreakableContext;
			delete cell.__height;
			delete cell._lastPageNumber;
			delete cell._rowSpanCurrentOffset;
		}
	}
}

const getPageVectorRegistry = (
	processor: TableProcessor,
	page: PdfPage,
): TablePageVectorRegistry => {
	let registry = processor.vectorRegistryByPage.get(page);
	if (!registry) {
		registry = {
			horizontalItems: new Set(),
			leftVerticals: new Set(),
			rightVerticals: new Set(),
			leftFills: new Set(),
			rightFills: new Set(),
		};
		processor.vectorRegistryByPage.set(page, registry);
	}
	return registry;
};

export const trackTableVector = (
	processor: TableProcessor,
	vector: Vector,
	roles: TableVectorRole[],
	group?: object,
): void => {
	trackVectorInsertion(vector, (_pageIndex, page, pageItem) => {
		const registry = getPageVectorRegistry(processor, page);
		for (const role of roles) {
			switch (role) {
				case "horizontal":
					if (registry.horizontalGroup !== group) {
						registry.horizontalGroup = group;
						registry.horizontalItems.clear();
					}
					registry.horizontalItems.add(pageItem);
					break;
				case "leftVertical":
					registry.leftVerticals.add(pageItem);
					break;
				case "rightVertical":
					registry.rightVerticals.add(pageItem);
					break;
				case "leftFill":
					if (registry.leftFillGroup !== group) {
						registry.leftFillGroup = group;
						registry.leftFills.clear();
					}
					registry.leftFills.add(pageItem);
					break;
				case "rightFill":
					if (registry.rightFillGroup !== group) {
						registry.rightFillGroup = group;
						registry.rightFills.clear();
					}
					registry.rightFills.add(pageItem);
					break;
			}
		}
	});
};

export const hasExplicitPageBreak = (cell: LayoutTableCell): boolean => {
	if (!cell || typeof cell !== "object") {
		return false;
	}

	return typeof cell.pageBreak === "string" && pageBreakValues.has(cell.pageBreak);
};

/**
 * Width each percentage column reserves inside its share of the table width: its paddings, all of
 * its outer border on the table edges and half of each border it shares with a neighbor.
 */
export function getPercentageReservedWidths(tableNode: LayoutTableNode): number[] {
	const layout = tableNode.metrics.layout;
	const widths = requireTable(tableNode).widths;
	return widths.map((column, index) => {
		if (!ColumnCalculator.isPercentageColumn(column)) return 0;
		const paddingLeft = layout.paddingLeft(index, tableNode);
		const paddingRight = layout.paddingRight(index, tableNode);
		const borderLeft = layout.vLineWidth(index, tableNode);
		const borderRight = layout.vLineWidth(index + 1, tableNode);
		if (index === 0) {
			// first column assumes whole borderLeft and half of border right
			return paddingLeft + paddingRight + borderLeft + borderRight / 2;
		}
		if (index === widths.length - 1) {
			// last column assumes whole borderRight and half of border left
			return paddingLeft + paddingRight + borderLeft / 2 + borderRight;
		}
		// Columns in the middle assume half of each border
		return paddingLeft + paddingRight + borderLeft / 2 + borderRight / 2;
	});
}

export const getTableInnerContentWidth = (tableNode: LayoutTableNode): number =>
	requireTable(tableNode).widths.reduce((width: number, column: ColumnWidth) => {
		return width + (column._calcWidth ?? column._minWidth);
	}, 0);

export const createRowSpanData = (
	tableNode: LayoutTableNode,
	layout: ResolvedTableLayout,
	horizontalOffset = 0,
): RowSpanData[] => {
	const data: RowSpanData[] = [{ left: horizontalOffset, rowSpan: 0 }];
	let left = horizontalOffset;
	const table = requireTable(tableNode);

	const columnCount = table.body[0]?.length ?? 0;
	for (let index = 0; index < columnCount; index++) {
		const padding = layout.paddingLeft(index, tableNode) + layout.paddingRight(index, tableNode);
		const width =
			padding + layout.vLineWidth(index, tableNode) + (table.widths[index]?._calcWidth ?? 0);
		const previous = data.at(-1);
		if (previous) previous.width = width;
		left += width;
		data.push({ left, rowSpan: 0, width: 0 });
	}

	return data;
};

export const propagateCellBorders = (body: LayoutTableCell[][]): void => {
	const setBorder = (
		rowIndex: number,
		columnIndex: number,
		borderIndex: number,
		value: boolean,
	): void => {
		const cell = body[rowIndex]?.[columnIndex];
		if (!cell) return;
		cell.border ||= [true, true, true, true];
		cell.border[borderIndex] = value;
	};

	for (const [rowIndex, row] of body.entries()) {
		for (const [columnIndex, cell] of row.entries()) {
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
