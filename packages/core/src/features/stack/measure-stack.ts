import type { NodeMeasureContext } from "../../engine/contracts/node-feature";
import type { MeasuredStackNode } from "./stack.types";

export function measureStack(
	node: MeasuredStackNode,
	context: Pick<NodeMeasureContext, "measureNode">,
): MeasuredStackNode {
	const items = node.stack;
	node._minWidth = 0;
	node._maxWidth = 0;

	for (let index = 0; index < items.length; index++) {
		items[index] = context.measureNode(items[index]);
		node._minWidth = Math.max(node._minWidth, items[index]._minWidth ?? 0);
		node._maxWidth = Math.max(node._maxWidth, items[index]._maxWidth ?? 0);
	}
	return node;
}
