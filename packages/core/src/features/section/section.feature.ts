import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutSection, type SectionLayoutContext } from "./layout-section";
import { measureSection, type SectionMeasureContext } from "./measure-section";
import { preprocessSection, type SectionPreprocessContext } from "./preprocess-section";

interface SectionFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: never;
	preprocessContext: SectionPreprocessContext;
	measureContext: SectionMeasureContext;
	layoutContext: SectionLayoutContext;
	renderContext: never;
}

interface SectionFeature extends NodeFeature<SectionFeatureStages> {
	measure(node: MeasuredPdfNode, context: SectionMeasureContext): MeasuredPdfNode;
	layout(node: LayoutPdfNode, context: SectionLayoutContext): void;
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
