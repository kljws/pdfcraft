import type { PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";

export interface ListPreprocessContext {
	preprocessNode(input: unknown): PreprocessedPdfNode;
}

export function preprocessList(
	node: PreprocessedPdfNode,
	context: ListPreprocessContext,
): PreprocessedPdfNode {
	const property = node.ul ? "ul" : "ol";
	const value = node[property];
	if (!Array.isArray(value)) {
		throw new Error(
			`Invalid ${property} node: '${property}' must be an array, received ${stringifyNode(node)}`,
		);
	}

	for (let index = 0; index < value.length; index++) {
		value[index] = context.preprocessNode(value[index]);
	}
	return node;
}
