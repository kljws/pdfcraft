import type StyleContextStack from "../styles/style-context-stack";
import type { Alignment } from "../../types";
import type { Dimensions, MeasuredPdfNode } from "../../types/internal";
import { isNumber } from "../../utils/variable-type";

export function measureBox(
	node: MeasuredPdfNode,
	dimensions: Dimensions,
	styles: StyleContextStack,
): MeasuredPdfNode {
	if (Array.isArray(node.fit)) {
		const factor =
			dimensions.width / dimensions.height > node.fit[0] / node.fit[1]
				? node.fit[0] / dimensions.width
				: node.fit[1] / dimensions.height;
		node._width = node._minWidth = node._maxWidth = dimensions.width * factor;
		node._height = dimensions.height * factor;
	} else if (node.cover) {
		node._width = node._minWidth = node._maxWidth = node.cover.width;
		node._height = node._minHeight = node._maxHeight = node.cover.height;
	} else {
		const nodeWidth = isNumber(node.width) ? node.width : undefined;
		const nodeHeight = isNumber(node.height) ? node.height : undefined;
		const ratio = dimensions.width / dimensions.height;

		node._width =
			node._minWidth =
			node._maxWidth =
				nodeWidth || (nodeHeight ? nodeHeight * ratio : dimensions.width);
		node._height = nodeHeight || (nodeWidth ? nodeWidth / ratio : dimensions.height);

		if (isNumber(node.maxWidth) && node.maxWidth < node._width) {
			node._width = node._minWidth = node._maxWidth = node.maxWidth;
			node._height = (node._width * dimensions.height) / dimensions.width;
		}

		if (isNumber(node.maxHeight) && node.maxHeight < node._height) {
			node._height = node.maxHeight;
			node._width =
				node._minWidth =
				node._maxWidth =
					(node._height * dimensions.width) / dimensions.height;
		}

		if (isNumber(node.minWidth) && node.minWidth > node._width) {
			node._width = node._minWidth = node._maxWidth = node.minWidth;
			node._height = (node._width * dimensions.height) / dimensions.width;
		}

		if (isNumber(node.minHeight) && node.minHeight > node._height) {
			node._height = node.minHeight;
			node._width =
				node._minWidth =
				node._maxWidth =
					(node._height * dimensions.width) / dimensions.height;
		}
	}

	node._alignment = styles.getProperty("alignment") as Alignment | undefined;
	return node;
}
