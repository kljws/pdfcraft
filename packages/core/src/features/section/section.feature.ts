import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutSection, type SectionLayoutContext } from "./layout-section";
import { measureSection, type SectionMeasureContext } from "./measure-section";
import { preprocessSection, type SectionPreprocessContext } from "./preprocess-section";
import type {
	LayoutSectionNode,
	MeasuredSectionNode,
	PreprocessedSectionNode,
} from "./section.types";

interface SectionFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedSectionNode;
	measuredNode: MeasuredSectionNode;
	layoutNode: LayoutSectionNode;
	renderNode: never;
	preprocessContext: SectionPreprocessContext;
	measureContext: SectionMeasureContext;
	layoutContext: SectionLayoutContext;
	renderContext: never;
}

interface SectionFeature extends NodeFeature<SectionFeatureStages> {
	preprocess(node: PdfNode, context: SectionPreprocessContext): PreprocessedSectionNode;
	measure(node: MeasuredSectionNode, context: SectionMeasureContext): MeasuredSectionNode;
	layout(node: LayoutSectionNode, context: SectionLayoutContext): void;
}

export const sectionFeature: SectionFeature = {
	kind: "section",
	matches(node): boolean {
		return Boolean(node.section);
	},
	preprocess: preprocessSection,
	measure: measureSection,
	layout: layoutSection,
};
