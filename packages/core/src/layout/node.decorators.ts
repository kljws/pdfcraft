import type { LayoutPdfNode } from "../types/internal";

export interface NodeDecorationHooks {
	decorateFeature(node: LayoutPdfNode): void;
	resetFeature(node: LayoutPdfNode): void;
}

export function decorateNode(node: LayoutPdfNode, hooks: NodeDecorationHooks): void {
	const x = node.x;
	const y = node.y;
	node.positions = [];
	hooks.decorateFeature(node);

	node.resetXY = () => {
		node.x = x;
		node.y = y;
		hooks.resetFeature(node);
	};
}
