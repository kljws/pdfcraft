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

	const decoration = node._decoration;
	if (decoration) {
		// The decoration adds its borders and horizontal padding around the items.
		const [paddingLeft, , paddingRight] = decoration.padding;
		const inset = decoration.borderWidth + paddingLeft + (paddingRight + decoration.borderWidth);
		node._contentMinWidth = node._minWidth;
		node._minWidth += inset;
		node._maxWidth += inset;
	}
	return node;
}
