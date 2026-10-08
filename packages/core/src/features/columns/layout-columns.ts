import ColumnCalculator from "../../layout/column-calculator";
import type PageElementWriter from "../../layout/element-writer.page";
import {
	completeVerticalAlignment,
	type VerticalAlignmentControls,
} from "../../engine/layout-node-lifecycle";
import type { LayoutPdfNode, Position } from "../../types/internal";
import { createColumnFlow } from "./column-flow";
import type { LayoutColumnsNode } from "./columns.types";

export type ColumnsLayoutContext = {
	writer: PageElementWriter;
	/** Enters a nested container level and returns the new level (1 for a top-level container). */
	enterNestedLevel(): number;
	leaveNestedLevel(): number;
	processNode(
		node: LayoutPdfNode,
		isVerticalAlignmentAllowed?: boolean,
	): VerticalAlignmentControls | undefined;
};

/**
 * Lays out the columns of a row side by side: each column starts at the top of the row, and the
 * row ends below its longest column. With `snakingColumns`, only the first column receives
 * content; it flows into the following columns as each one fills.
 */
export function layoutColumns(node: LayoutColumnsNode, context: ColumnsLayoutContext): void {
	const nestedLevel = context.enterNestedLevel();
	const columns = node.columns;
	if (!columns) throw new Error("Internal layout error: expected preprocessed columns");
	const columnCount = columns.length;
	let availableWidth = context.writer.context().availableWidth;
	const gap = node._gap ?? 0;
	const gaps = buildGapArray(columnCount, gap);

	if (gaps) availableWidth -= (gaps.length - 1) * gap;
	ColumnCalculator.buildColumnWidths(columns, availableWidth);

	const widths = columns.map((column) => column._calcWidth ?? column._minWidth);
	// The horizontal margins of a top-level row bound the columns' flow across pages.
	const marginX: [number, number] | null =
		nestedLevel === 1 ? (node._margin ? [node._margin[0], node._margin[2]] : [0, 0]) : null;
	const flow = node.snakingColumns
		? createColumnFlow(gaps && gaps.length > 1 ? gap : 0, widths)
		: undefined;
	context.writer.context().beginColumnGroup(marginX, {}, flow);

	const alignedColumns: Array<{ column: LayoutPdfNode; controls: VerticalAlignmentControls }> = [];
	const positions: Position[] = [];
	for (const [index, column] of columns.entries()) {
		const width = column._calcWidth ?? column._minWidth;
		context.writer.context().beginColumn(width, gaps?.[index] ?? 0);
		// The geometry of every column is set up, but snaking content starts in the first one.
		if (node.snakingColumns && index > 0) continue;

		const controls = context.processNode(column, true);
		if (column.verticalAlignment && controls) alignedColumns.push({ column, controls });
		positions.push(...(column.positions ?? []));
	}

	context.writer.context().completeColumnGroup();
	const rowHeight = context.writer.context().height;
	for (const { column, controls } of alignedColumns) {
		const columnPositions = column.positions ?? [];
		const firstPageNumber = columnPositions[0]?.pageNumber;
		const nodeHeight = column.__height ?? 0;
		completeVerticalAlignment(controls, {
			isContentMultiPage: columnPositions.some(
				(position) => position.pageNumber !== firstPageNumber,
			),
			getNodeHeight: () => nodeHeight,
			getViewHeight: () => rowHeight,
		});
	}

	node.positions ??= [];
	node.positions.push(...positions);

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
