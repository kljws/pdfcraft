import type { ColumnNode, PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";

export interface ColumnsPreprocessContext {
	preprocessNode(input: unknown): PreprocessedPdfNode;
}

export function preprocessColumns(
	node: PreprocessedPdfNode,
	context: ColumnsPreprocessContext,
): PreprocessedPdfNode {
	if (!Array.isArray(node.columns)) {
		throw new Error(
			`Invalid columns node: 'columns' must be an array, received ${stringifyNode(node)}`,
		);
	}

	for (let index = 0; index < node.columns.length; index++) {
		node.columns[index] = context.preprocessNode(
			node.columns[index],
		) as ColumnNode<PreprocessedPdfNode>;
	}
	return node;
}
