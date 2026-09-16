import type { PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";

export interface StackPreprocessContext {
	allowSections: boolean;
	preprocessNode(input: unknown, isSectionAllowed?: boolean): PreprocessedPdfNode;
}

export function preprocessStack(
	node: PreprocessedPdfNode,
	context: StackPreprocessContext,
): PreprocessedPdfNode {
	if (!Array.isArray(node.stack)) {
		throw new Error(
			`Invalid stack node: 'stack' must be an array, received ${stringifyNode(node)}`,
		);
	}

	for (let index = 0; index < node.stack.length; index++) {
		node.stack[index] = context.preprocessNode(node.stack[index], context.allowSections);
	}
	return node;
}
