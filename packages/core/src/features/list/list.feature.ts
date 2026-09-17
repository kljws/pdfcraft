import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutList, type ListLayoutContext } from "./layout-list";
import type {
	LayoutListNode,
	ListMeasureNode,
	MeasuredListNode,
	PreprocessedListNode,
} from "./list.types";
import { measureOrderedList, measureUnorderedList, type ListMeasureContext } from "./measure-list";
import { preprocessList, type ListPreprocessContext } from "./preprocess-list";

interface ListFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedListNode;
	measuredNode: ListMeasureNode;
	layoutNode: LayoutListNode;
	renderNode: never;
	preprocessContext: ListPreprocessContext;
	measureContext: ListMeasureContext;
	layoutContext: ListLayoutContext;
	renderContext: never;
}

interface ListFeature extends NodeFeature<ListFeatureStages> {
	preprocess(node: PdfNode, context: ListPreprocessContext): PreprocessedListNode;
	measure(node: ListMeasureNode, context: ListMeasureContext): MeasuredListNode;
	measureUnordered(node: ListMeasureNode, context: ListMeasureContext): MeasuredListNode;
	measureOrdered(node: ListMeasureNode, context: ListMeasureContext): MeasuredListNode;
	layout(node: LayoutListNode, context: ListLayoutContext): void;
}

export const listFeature: ListFeature = {
	kind: "list",
	matches(node): boolean {
		return Boolean(node.ul || node.ol);
	},
	preprocess: preprocessList,
	measure(node, context): MeasuredListNode {
		return node.ul ? measureUnorderedList(node, context) : measureOrderedList(node, context);
	},
	measureUnordered: measureUnorderedList,
	measureOrdered: measureOrderedList,
	layout: layoutList,
};
