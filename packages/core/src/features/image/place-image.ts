import type { NodePlaceContext } from "../../engine/contracts/node-feature";
import { addPageItem, alignImage } from "../../layout/element-writer.helpers";
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

	if (
		!page ||
		(image.absolutePosition === undefined &&
			context.availableHeight < height &&
			page.items.length > 0)
	) {
		return false;
	}

	image._x ??= image.x || 0;
	image.x = context.x + image._x;
	image.y = context.y;
	alignImage(image, context.availableWidth);
	addPageItem(page, { type: "image", item: image }, index);
	context.moveDown(height);
	return position;
}
