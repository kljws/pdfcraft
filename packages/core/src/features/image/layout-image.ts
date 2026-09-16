import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutPdfNode } from "../../types/internal";

export interface ImageLayoutContext {
	writer: Pick<PageElementWriter, "addImage">;
}

export function layoutImage(node: LayoutPdfNode, context: ImageLayoutContext): void {
	const position = context.writer.addImage(node);
	if (position) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
