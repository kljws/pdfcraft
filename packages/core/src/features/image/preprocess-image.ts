import type { PreprocessedPdfNode } from "../../types/internal";
import { isObject } from "../../utils/variable-type";

export function preprocessImage(node: PreprocessedPdfNode): PreprocessedPdfNode {
	const image = node.image;
	if (isObject(image) && image.type === "Buffer" && Array.isArray(image.data)) {
		node.image = Uint8Array.from(image.data);
	}
	return node;
}
