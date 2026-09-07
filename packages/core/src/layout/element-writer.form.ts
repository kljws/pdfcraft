import type DocumentContext from "../document/document-context";
import type { CurrentPosition, LayoutPdfNode } from "../types/internal";
import { addPageItem, alignImage } from "./element-writer.helpers";

interface FormWriter {
	context(): DocumentContext;
	getCurrentPositionOnPage(): CurrentPosition;
}

export function addAcroForm(
	writer: FormWriter,
	node: LayoutPdfNode,
	index?: number,
): CurrentPosition | false {
	const context = writer.context();
	const page = context.getCurrentPage();
	const height = typeof node.height === "number" ? node.height : 15;
	if (
		!page ||
		(node.absolutePosition === undefined &&
			context.availableHeight < height &&
			page.items.length > 0)
	) {
		return false;
	}

	const position = writer.getCurrentPositionOnPage();
	node._width = typeof node.width === "number" ? node.width : Math.max(0, context.availableWidth);
	node._height = height;
	node._x ??= node.x || 0;
	node.x = context.x + node._x;
	node.y = context.y;
	alignImage(node, context.availableWidth);
	addPageItem(page, { type: "acroform", item: node }, index);
	context.moveDown(height);
	return position;
}
