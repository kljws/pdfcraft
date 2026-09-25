import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode, markNodeKind } from "../../utils/node";
import type { PreprocessedSectionNode } from "./section.types";

export interface SectionPreprocessContext {
	allowSections: boolean;
	preprocessNode(input: unknown): PreprocessedPdfNode;
}

export function preprocessSection(
	node: PdfNode,
	context: SectionPreprocessContext,
): PreprocessedSectionNode {
	if (!context.allowSections) {
		throw new Error(
			`Incorrect document structure, section node is only allowed at the root level of document structure: ${stringifyNode(node)}`,
		);
	}
	const sectionNode = markNodeKind(node, "section");
	sectionNode.section = context.preprocessNode(sectionNode.section);
	return sectionNode;
}
