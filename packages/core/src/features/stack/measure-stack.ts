import type { NodeMeasureContext } from "../../engine/contracts/node-feature";
import type { MeasuredStackNode } from "./stack.types";

export function measureStack(
	node: MeasuredStackNode,
	context: Pick<NodeMeasureContext, "measureNode">,
): MeasuredStackNode {
	const items = node.stack;
	node._minWidth = 0;
	node._maxWidth = 0;

	for (const [index, pending] of items.entries()) {
		const item = (items[index] = context.measureNode(pending));
		node._minWidth = Math.max(node._minWidth, item._minWidth ?? 0);
		node._maxWidth = Math.max(node._maxWidth, item._maxWidth ?? 0);
	}
	return node;
}
