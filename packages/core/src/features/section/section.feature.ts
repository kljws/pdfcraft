import type { NodeFeature, NodeFeatureStages, NodeLayoutContext, NodeMeasureContext } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasurePdfNode, PdfNode } from "../../types/internal";
import { layoutSection } from "./layout-section";
import { measureSection } from "./measure-section";
import { preprocessSection, type SectionPreprocessContext } from "./preprocess-section";
import type {
	LayoutSectionNode,
	MeasuredSectionNode,
	PreprocessedSectionNode,
} from "./section.types";

interface SectionFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedSectionNode;
	measureNode: MeasurePdfNode;
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
	measure(node: MeasurePdfNode, context: NodeMeasureContext): MeasuredSectionNode;
	layout(node: LayoutPdfNode, context: NodeLayoutContext): void;
}

export const sectionFeature: SectionFeature = {
	kind: "section",
	matches(node): boolean {
		return Boolean(node.section);
	},
	preprocess: preprocessSection,
	measure(node, context): MeasuredSectionNode {
		return measureSection(node as MeasuredSectionNode, {
			measureNode: (item) => context.measureNode(item),
		});
	},
	layout(node, context): void {
		layoutSection(node as LayoutSectionNode, {
			writer: context.writer,
			defaultPageSize: context.pageSize,
			defaultPageMargins: context.pageMargins,
			processNode: (item) => context.processNode(item),
		});
	},
};
