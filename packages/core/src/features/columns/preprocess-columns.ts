import type { ColumnNode, PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";
import type { PreprocessedColumnsNode } from "./columns.types";

export interface ColumnsPreprocessContext {
	preprocessNode(input: unknown): PreprocessedPdfNode;
}

export function preprocessColumns(
	node: PdfNode,
	context: ColumnsPreprocessContext,
): PreprocessedColumnsNode {
	if (!Array.isArray(node.columns)) {
		throw new Error(
			`Invalid columns node: 'columns' must be an array, received ${stringifyNode(node)}`,
		);
	}

	node._kind = "columns";
	const columnsNode = node as unknown as PreprocessedColumnsNode;
	for (let index = 0; index < columnsNode.columns.length; index++) {
		columnsNode.columns[index] = context.preprocessNode(
			columnsNode.columns[index],
		) as ColumnNode<PreprocessedPdfNode>;
	}
	return columnsNode;
}
