import type { NodePlaceContext } from "../../engine/contracts/node-feature";
import { addPageItem } from "../../layout/element-writer.helpers";
import type { CurrentPosition } from "../../types/internal";
import type { LayoutAttachmentNode } from "./attachment.types";

export function placeAttachmentItem(
	attachment: LayoutAttachmentNode,
	{ writer, index }: NodePlaceContext,
): CurrentPosition | false {
	const height = attachment._height ?? 0;
	const context = writer.context();
	const page = context.getCurrentPage();
	const position = writer.getCurrentPositionOnPage();

	if (
		!page ||
		(attachment.absolutePosition === undefined &&
			context.availableHeight < height &&
			page.items.length > 0)
	) {
		return false;
	}

	attachment._x ??= attachment.x || 0;
	attachment.x = context.x + attachment._x;
	attachment.y = context.y;
	addPageItem(page, { type: "attachment", item: attachment }, index);
	context.moveDown(height);
	return position;
}
