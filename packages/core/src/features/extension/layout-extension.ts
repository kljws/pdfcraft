import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutExtensionNode } from "./extension.types";

export interface ExtensionLayoutContext {
	writer: PageElementWriter;
}

export function layoutExtension(node: LayoutExtensionNode, context: ExtensionLayoutContext): void {
	const position = context.writer.addFeatureItem("extension", node);
	if (position && !Array.isArray(position)) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
