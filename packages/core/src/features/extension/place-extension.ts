import type DocumentContext from "../../document/document-context";
import type { CurrentPosition, LayoutPdfNode } from "../../types/internal";
import { addPageItem, alignImage } from "../../layout/element-writer.helpers";

export interface ExtensionWriter {
	context(): DocumentContext;
	getCurrentPositionOnPage(): CurrentPosition;
}

export function placeExtension(
	writer: ExtensionWriter,
	node: LayoutPdfNode,
	index?: number,
): CurrentPosition | false {
	const height = node._height ?? 0;
	const context = writer.context();
	const page = context.getCurrentPage();
	const position = writer.getCurrentPositionOnPage();

	if (
		!page ||
		(node.absolutePosition === undefined &&
			context.availableHeight < height &&
			page.items.length > 0)
	) {
		return false;
	}

	node._x ??= node.x || 0;
	node.x = context.x + node._x;
	node.y = context.y;
	alignImage(node, context.availableWidth);
	addPageItem(page, { type: "extension", item: node }, index);
	context.moveDown(height);
	return position;
}
