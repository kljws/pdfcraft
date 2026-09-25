import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutImageNode } from "./image.types";

export interface ImageLayoutContext {
	writer: Pick<PageElementWriter, "addFeatureItem">;
}

export function layoutImage(node: LayoutImageNode, context: ImageLayoutContext): void {
	const position = context.writer.addFeatureItem("image", node);
	if (position && !Array.isArray(position)) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
