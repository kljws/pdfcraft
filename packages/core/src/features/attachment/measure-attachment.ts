import { isNumber } from "../../utils/variable-type";
import type { MeasuredAttachmentNode } from "./attachment.types";

export function measureAttachment(node: MeasuredAttachmentNode): MeasuredAttachmentNode {
	node._width = isNumber(node.width) ? node.width : 7;
	node._height = isNumber(node.height) ? node.height : 18;
	return node;
}
