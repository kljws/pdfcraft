import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";
import type { PreprocessedListNode } from "./list.types";

export interface ListPreprocessContext {
	preprocessNode(input: unknown): PreprocessedPdfNode;
}

export function preprocessList(
	node: PdfNode,
	context: ListPreprocessContext,
): PreprocessedListNode {
	const property = node.ul ? "ul" : "ol";
	const value = node[property];
	if (!Array.isArray(value)) {
		throw new Error(
			`Invalid ${property} node: '${property}' must be an array, received ${stringifyNode(node)}`,
		);
	}

	node._kind = "list";
	const listNode = node as unknown as PreprocessedListNode;
	const items = listNode[property];
	if (!items) throw new Error(`Internal preprocessing error: missing '${property}' list`);
	for (let index = 0; index < items.length; index++) {
		items[index] = context.preprocessNode(items[index]);
	}
	return listNode;
}
