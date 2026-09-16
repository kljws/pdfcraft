import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutPdfNode } from "../../types/internal";

export interface AttachmentLayoutContext {
	writer: Pick<PageElementWriter, "addAttachment">;
}

export function layoutAttachment(node: LayoutPdfNode, context: AttachmentLayoutContext): void {
	const position = context.writer.addAttachment(node);
	if (position) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
