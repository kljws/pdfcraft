import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutAttachmentNode } from "./attachment.types";

export interface AttachmentLayoutContext {
	writer: Pick<PageElementWriter, "addFeatureItem">;
}

export function layoutAttachment(
	node: LayoutAttachmentNode,
	context: AttachmentLayoutContext,
): void {
	const position = context.writer.addFeatureItem("attachment", node);
	if (position && !Array.isArray(position)) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
