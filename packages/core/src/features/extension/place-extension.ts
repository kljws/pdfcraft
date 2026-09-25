import type { NodePlaceContext } from "../../engine/contracts/node-feature";
import type { CurrentPosition } from "../../types/internal";
import { addPageItem, alignImage } from "../../layout/element-writer.helpers";
import type { LayoutExtensionNode } from "./extension.types";

export function placeExtensionItem(
	node: LayoutExtensionNode,
	{ writer, index }: NodePlaceContext,
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
