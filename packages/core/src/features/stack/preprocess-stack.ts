import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";
import type { PreprocessedStackNode } from "./stack.types";

export interface StackPreprocessContext {
	allowSections: boolean;
	preprocessNode(input: unknown, isSectionAllowed?: boolean): PreprocessedPdfNode;
}

export function preprocessStack(
	node: PdfNode,
	context: StackPreprocessContext,
): PreprocessedStackNode {
	if (!Array.isArray(node.stack)) {
		throw new Error(
			`Invalid stack node: 'stack' must be an array, received ${stringifyNode(node)}`,
		);
	}

	node._kind = "stack";
	const stackNode = node as unknown as PreprocessedStackNode;
	for (let index = 0; index < stackNode.stack.length; index++) {
		stackNode.stack[index] = context.preprocessNode(stackNode.stack[index], context.allowSections);
	}
	return stackNode;
}
