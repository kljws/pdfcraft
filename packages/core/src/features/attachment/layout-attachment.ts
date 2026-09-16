import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutAttachmentNode } from "./attachment.types";

export interface AttachmentLayoutContext {
	writer: Pick<PageElementWriter, "addAttachment">;
}

export function layoutAttachment(node: LayoutAttachmentNode, context: AttachmentLayoutContext): void {
	const position = context.writer.addAttachment(node);
	if (position) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
