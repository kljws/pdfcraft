import type { MeasuredPdfNode, PendingMeasureNode } from "../../types/internal";
import type { MeasuredSectionNode } from "./section.types";

export interface SectionMeasureContext {
	measureNode(node: PendingMeasureNode): MeasuredPdfNode;
}

export function measureSection(
	node: MeasuredSectionNode,
	context: SectionMeasureContext,
): MeasuredSectionNode {
	node.section = context.measureNode(node.section);
	return node;
}
