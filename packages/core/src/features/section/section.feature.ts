import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutSection } from "./layout-section";
import { preprocessSection, type SectionPreprocessContext } from "./preprocess-section";
import type {
	LayoutSectionNode,
	MeasuredSectionNode,
	PreprocessedSectionNode,
} from "./section.types";

interface SectionFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedSectionNode;
	measureNode: MeasuredSectionNode;
	measuredNode: MeasuredSectionNode;
	layoutNode: LayoutSectionNode;
	renderNode: never;
	preprocessContext: SectionPreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: never;
}

interface SectionFeature extends NodeFeature<SectionFeatureStages> {
	readonly kind: "section";
	preprocess(node: PdfNode, context: SectionPreprocessContext): PreprocessedSectionNode;
	measure(node: MeasuredSectionNode, context: NodeMeasureContext): MeasuredSectionNode;
	layout(node: LayoutSectionNode, context: NodeLayoutContext): void;
}

export const sectionFeature: SectionFeature = {
	kind: "section",
	matches(node): boolean {
		return Boolean(node.section);
	},
	preprocess: preprocessSection,
	measure(node, context): MeasuredSectionNode {
		node.section = context.measureNode(node.section);
		return node;
	},
	layout(node, context): void {
		layoutSection(node, {
			writer: context.writer,
			defaultPageSize: context.pageSize,
			defaultPageMargins: context.pageMargins,
			processNode: (item) => context.processNode(item),
		});
	},
};
