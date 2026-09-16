import type DocumentContext from "../../document/document-context";
import { addPageItem, alignImage } from "../../layout/element-writer.helpers";
import type { CurrentPosition, LayoutPdfNode } from "../../types/internal";

export interface ImageWriter {
	context(): DocumentContext;
	getCurrentPositionOnPage(): CurrentPosition;
}

export function placeImage(
	writer: ImageWriter,
	image: LayoutPdfNode,
	index?: number,
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
