import type { MeasuredPdfNode } from "../../types/internal";
import { isNumber } from "../../utils/variable-type";

export function measureAttachment(node: MeasuredPdfNode): MeasuredPdfNode {
	node._width = isNumber(node.width) ? node.width : 7;
	node._height = isNumber(node.height) ? node.height : 18;
	return node;
}
