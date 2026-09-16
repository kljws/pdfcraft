import type { PreprocessedPdfNode } from "../../types/internal";
import { isObject } from "../../utils/variable-type";
import type { PreprocessedImageNode } from "./image.types";

export function preprocessImage(node: PreprocessedPdfNode): PreprocessedImageNode {
	const image = node.image;
	if (isObject(image) && image.type === "Buffer" && Array.isArray(image.data)) {
		node.image = Uint8Array.from(image.data);
	}
	node._kind = "image";
	return node as PreprocessedImageNode;
}
