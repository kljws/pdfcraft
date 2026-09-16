import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutToc, type TocLayoutContext } from "./layout-toc";
import { measureToc, type TocMeasureContext } from "./measure-toc";
import {
	preprocessToc,
	registerTocItem,
	type TocItemRegistrationContext,
	type TocPreprocessContext,
} from "./preprocess-toc";

interface TocFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: never;
	preprocessContext: TocPreprocessContext;
	measureContext: TocMeasureContext;
	layoutContext: TocLayoutContext;
	renderContext: never;
}

interface TocFeature extends NodeFeature<TocFeatureStages> {
	registerItem(node: PreprocessedPdfNode, context: TocItemRegistrationContext): void;
	measure(node: MeasuredPdfNode, context: TocMeasureContext): MeasuredPdfNode;
	layout(node: LayoutPdfNode, context: TocLayoutContext): void;
}

export const tocFeature: TocFeature = {
	kind: "toc",
	matches(node): boolean {
		return Boolean(node.toc);
	},
	preprocess: preprocessToc,
	registerItem: registerTocItem,
	measure: measureToc,
	layout: layoutToc,
};
