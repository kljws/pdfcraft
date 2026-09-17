import type { PageOrientation } from "../../types";
import type { LayoutPdfNode } from "../../types/internal";
import type { LayoutStackNode } from "./stack.types";

export interface StackLayoutContext {
	processNode(node: LayoutPdfNode): void;
	moveDownWithPageBreak(height: number, pageOrientation?: PageOrientation): void;
}

export function layoutStack(node: LayoutStackNode, context: StackLayoutContext): void {
	const stack = node.stack;
	if (!stack) throw new Error("Internal layout error: expected a preprocessed stack node");
	node.positions ??= [];
	const positions = node.positions;

	for (let index = 0; index < stack.length; index++) {
		const item = stack[index];
		context.processNode(item);
		positions.push(...(item.positions ?? []));

		if (item._kind === "text" && item.text !== undefined && index < stack.length - 1) {
			context.moveDownWithPageBreak(item._paragraphGap ?? 0, item.pageOrientation);
		}
	}
}
