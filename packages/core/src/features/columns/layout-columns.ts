import ColumnCalculator from "../../layout/column-calculator";
import type PageElementWriter from "../../layout/element-writer.page";
import type { ColumnWidth, LayoutPdfNode, Position } from "../../types/internal";

interface ColumnsRowOptions {
	marginX: [number, number];
	cells: LayoutPdfNode[];
	widths: ColumnWidth[];
	gaps: number[] | null;
	snakingColumns?: boolean;
}

export interface ColumnsLayoutContext {
	writer: PageElementWriter;
	enterNestedLevel(): void;
	leaveNestedLevel(): number;
	processRow(options: ColumnsRowOptions): { positions: Position[] };
}

export function layoutColumns(node: LayoutPdfNode, context: ColumnsLayoutContext): void {
	context.enterNestedLevel();
	const columns = node.columns;
	if (!columns) throw new Error("Internal layout error: expected preprocessed columns");
	const columnCount = columns.length;
	let availableWidth = context.writer.context().availableWidth;
	const gaps = buildGapArray(columnCount, node._gap ?? 0);

	if (gaps) availableWidth -= (gaps.length - 1) * (node._gap ?? 0);
	ColumnCalculator.buildColumnWidths(columns, availableWidth);
	const result = context.processRow({
		marginX: node._margin ? [node._margin[0], node._margin[2]] : [0, 0],
		cells: columns,
		widths: columns,
		gaps,
		snakingColumns: node.snakingColumns,
	});
	node.positions ??= [];
	node.positions.push(...result.positions);

	if (context.leaveNestedLevel() === 0) {
		context.writer.context().resetMarginXTopParent();
	}
}

const buildGapArray = (columnCount: number, gap: number): number[] | null => {
	if (!gap) return null;
	const gaps: number[] = [0];
	for (let index = columnCount - 1; index > 0; index--) gaps.push(gap);
	return gaps;
};
