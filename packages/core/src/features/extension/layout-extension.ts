import type { LayoutPdfNode } from "../../types/internal";
import type PageElementWriter from "../../layout/element-writer.page";

export interface ExtensionLayoutContext {
	writer: PageElementWriter;
}

export function layoutExtension(node: LayoutPdfNode, context: ExtensionLayoutContext): void {
	const position = context.writer.addExtension(node);
	if (position) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
