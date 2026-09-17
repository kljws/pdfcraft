import type { MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import type { MeasuredSectionNode } from "./section.types";

export interface SectionMeasureContext {
	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode;
}

export function measureSection(
	node: MeasuredSectionNode,
	context: SectionMeasureContext,
): MeasuredSectionNode {
	node.section = context.measureNode(node.section as unknown as PreprocessedPdfNode);
	return node;
}
