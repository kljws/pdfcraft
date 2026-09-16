import type { PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";

export interface SectionPreprocessContext {
	allowSections: boolean;
	preprocessNode(input: unknown): PreprocessedPdfNode;
}

export function preprocessSection(
	node: PreprocessedPdfNode,
	context: SectionPreprocessContext,
): PreprocessedPdfNode {
	if (!context.allowSections) {
		throw new Error(
			`Incorrect document structure, section node is only allowed at the root level of document structure: ${stringifyNode(node)}`,
		);
	}
	node.section = context.preprocessNode(node.section);
	return node;
}
