import { isNumber } from "../../utils/variable-type";
import type { MeasuredAttachmentNode, PreprocessedAttachmentNode } from "./attachment.types";

export function measureAttachment(node: PreprocessedAttachmentNode): MeasuredAttachmentNode {
	const measuredNode = node as MeasuredAttachmentNode;
	measuredNode._width = isNumber(node.width) ? node.width : 7;
	measuredNode._height = isNumber(node.height) ? node.height : 18;
	return measuredNode;
}
