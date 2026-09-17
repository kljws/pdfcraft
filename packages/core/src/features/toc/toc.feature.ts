import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutToc, type TocLayoutContext } from "./layout-toc";
import { measureToc, type TocMeasureContext } from "./measure-toc";
import {
	preprocessToc,
	registerTocItem,
	type TocItemRegistrationContext,
	type TocPreprocessContext,
} from "./preprocess-toc";
import type { LayoutTocNode, MeasuredTocNode, PreprocessedTocNode } from "./toc.types";

interface TocFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedTocNode;
	measuredNode: MeasuredTocNode;
	layoutNode: LayoutTocNode;
	renderNode: never;
	preprocessContext: TocPreprocessContext;
	measureContext: TocMeasureContext;
	layoutContext: TocLayoutContext;
	renderContext: never;
}

interface TocFeature extends NodeFeature<TocFeatureStages> {
	preprocess(node: PdfNode, context: TocPreprocessContext): PreprocessedTocNode;
	registerItem(node: PreprocessedPdfNode, context: TocItemRegistrationContext): void;
	measure(node: MeasuredTocNode, context: TocMeasureContext): MeasuredTocNode;
	layout(node: LayoutTocNode, context: TocLayoutContext): void;
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
