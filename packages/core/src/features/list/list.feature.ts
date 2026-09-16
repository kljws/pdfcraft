import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutList, type ListLayoutContext } from "./layout-list";
import { measureOrderedList, measureUnorderedList, type ListMeasureContext } from "./measure-list";
import { preprocessList, type ListPreprocessContext } from "./preprocess-list";

interface ListFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: never;
	preprocessContext: ListPreprocessContext;
	measureContext: ListMeasureContext;
	layoutContext: ListLayoutContext;
	renderContext: never;
}

interface ListFeature extends NodeFeature<ListFeatureStages> {
	measure(node: MeasuredPdfNode, context: ListMeasureContext): MeasuredPdfNode;
	measureUnordered(node: MeasuredPdfNode, context: ListMeasureContext): MeasuredPdfNode;
	measureOrdered(node: MeasuredPdfNode, context: ListMeasureContext): MeasuredPdfNode;
	layout(node: LayoutPdfNode, context: ListLayoutContext): void;
}

export const listFeature: ListFeature = {
	kind: "list",
	matches(node): boolean {
		return Boolean(node.ul || node.ol);
	},
	preprocess: preprocessList,
	measure(node, context): MeasuredPdfNode {
		return node.ul ? measureUnorderedList(node, context) : measureOrderedList(node, context);
	},
	measureUnordered: measureUnorderedList,
	measureOrdered: measureOrderedList,
	layout: layoutList,
};
