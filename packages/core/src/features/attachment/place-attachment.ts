import type { NodePlaceContext } from "../../engine/contracts/node-feature";
import { addPageItem, canPlaceOnCurrentPage } from "../../layout/element-writer.helpers";
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

	if (!canPlaceOnCurrentPage(attachment, height, page, context.availableHeight)) return false;

	attachment._x ??= attachment.x || 0;
	attachment.x = context.x + attachment._x;
	attachment.y = context.y;
	addPageItem(page, { type: "attachment", item: attachment }, index);
	context.moveDown(height);
	return position;
}
