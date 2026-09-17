import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutExtensionNode } from "./extension.types";

export interface ExtensionLayoutContext {
	writer: PageElementWriter;
}

export function layoutExtension(node: LayoutExtensionNode, context: ExtensionLayoutContext): void {
	const position = context.writer.addExtension(node);
	if (position) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
