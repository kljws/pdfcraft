import type { MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";

export interface SectionMeasureContext {
	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode;
}

export function measureSection(
	node: MeasuredPdfNode,
	context: SectionMeasureContext,
): MeasuredPdfNode {
	node.section = context.measureNode(node.section!);
	return node;
}
