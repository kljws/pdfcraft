import ColumnCalculator from "../../layout/column-calculator";
import type StyleContextStack from "../../services/styles/style-context-stack";
import type { ColumnNode, MeasuredPdfNode, PendingMeasureNode } from "../../types/internal";
import type { MeasuredColumnsNode } from "./columns.types";

export interface ColumnsMeasureContext {
	styles: StyleContextStack;
	measureChild(node: PendingMeasureNode): MeasuredPdfNode;
}

export function measureColumns(
	node: MeasuredColumnsNode,
	context: ColumnsMeasureContext,
): MeasuredColumnsNode {
	const columns = node.columns;
	const columnGap = context.styles.getProperty("columnGap");
	node._gap = typeof columnGap === "number" ? columnGap : 0;

	for (let index = 0; index < columns.length; index++) {
		columns[index] = context.measureChild(columns[index]) as ColumnNode<MeasuredPdfNode>;
	}

	const measures = ColumnCalculator.measureMinMax(columns);
	const gapCount = Math.max(0, columns.length - 1);
	node._minWidth = measures.min + node._gap * gapCount;
	node._maxWidth = measures.max + node._gap * gapCount;
	return node;
}
