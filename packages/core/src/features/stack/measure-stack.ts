import type { MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";

export interface StackMeasureContext {
	measureChild(node: PreprocessedPdfNode): MeasuredPdfNode;
}

export function measureStack(node: MeasuredPdfNode, context: StackMeasureContext): MeasuredPdfNode {
	const items = node.stack!;
	node._minWidth = 0;
	node._maxWidth = 0;

	for (let index = 0; index < items.length; index++) {
		items[index] = context.measureChild(items[index]);
		node._minWidth = Math.max(node._minWidth, items[index]._minWidth ?? 0);
		node._maxWidth = Math.max(node._maxWidth, items[index]._maxWidth ?? 0);
	}
	return node;
}
