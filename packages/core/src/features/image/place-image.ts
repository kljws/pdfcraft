import type { NodePlaceContext } from "../../engine/contracts/node-feature";
import { addPageItem, alignItem, canPlaceOnCurrentPage } from "../../layout/element-writer.helpers";
import type { CurrentPosition } from "../../types/internal";
import type { LayoutImageNode } from "./image.types";

export function placeImageItem(
	image: LayoutImageNode,
	{ writer, index }: NodePlaceContext,
): CurrentPosition | false {
	const height = image._height ?? 0;
	const context = writer.context();
	const page = context.getCurrentPage();
	const position = writer.getCurrentPositionOnPage();

	if (!canPlaceOnCurrentPage(image, height, page, context.availableHeight)) return false;

	image._x ??= image.x || 0;
	image.x = context.x + image._x;
	image.y = context.y;
	alignItem(image, context.availableWidth);
	addPageItem(page, { type: "image", item: image }, index);
	context.moveDown(height);
	return position;
}
