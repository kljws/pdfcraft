import ColumnCalculator from "../../layout/column-calculator";
import type { NodeMeasureContext } from "../../engine/contracts/node-feature";
import type { ColumnNode, MeasuredPdfNode } from "../../types/internal";
import type { MeasuredColumnsNode } from "./columns.types";

export function measureColumns(
	node: MeasuredColumnsNode,
	context: Pick<NodeMeasureContext, "styles" | "measureNode">,
): MeasuredColumnsNode {
	const columns = node.columns;
	const columnGap = context.styles.getProperty("columnGap");
	node._gap = typeof columnGap === "number" ? columnGap : 0;

	for (let index = 0; index < columns.length; index++) {
		columns[index] = context.measureNode(columns[index]) as ColumnNode<MeasuredPdfNode>;
	}

	const measures = ColumnCalculator.measureMinMax(columns);
	const gapCount = Math.max(0, columns.length - 1);
	node._minWidth = measures.min + node._gap * gapCount;
	node._maxWidth = measures.max + node._gap * gapCount;
	return node;
}
