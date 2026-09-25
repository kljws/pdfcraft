import type { NodeFeature, NodeFeatureStages, NodeLayoutContext, NodeMeasureContext } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasurePdfNode, PdfNode } from "../../types/internal";
import { layoutList } from "./layout-list";
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
	measureNode: MeasurePdfNode;
	measuredNode: ListMeasureNode;
	layoutNode: LayoutListNode;
	renderNode: never;
	preprocessContext: ListPreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: never;
}

interface ListFeature extends NodeFeature<ListFeatureStages> {
	readonly kind: "list";
	preprocess(node: PdfNode, context: ListPreprocessContext): PreprocessedListNode;
	measure(node: MeasurePdfNode, context: NodeMeasureContext): MeasuredListNode;
	measureUnordered(node: ListMeasureNode, context: ListMeasureContext): MeasuredListNode;
	measureOrdered(node: ListMeasureNode, context: ListMeasureContext): MeasuredListNode;
	layout(node: LayoutPdfNode, context: NodeLayoutContext): void;
}

export const listFeature: ListFeature = {
	kind: "list",
	matches(node): boolean {
		return Boolean(node.ul || node.ol);
	},
	preprocess: preprocessList,
	measure(node, context): MeasuredListNode {
		const listNode = node as ListMeasureNode;
		const measureContext: ListMeasureContext = {
			styles: context.styles,
			measureChild: (item) => context.measureNode(item),
			measureGap: () => context.inlines.sizeOfText("9. ", context.styles),
			buildMarkerInlines: (text, color, styles) =>
				context.inlines.buildInlines({ text, color }, styles).items,
		};
		return listNode.ul
			? measureUnorderedList(listNode, measureContext)
			: measureOrderedList(listNode, measureContext);
	},
	measureUnordered: measureUnorderedList,
	measureOrdered: measureOrderedList,
	layout(node, context): void {
		const listNode = node as LayoutListNode;
		layoutList(listNode, {
			writer: context.writer,
			ordered: !listNode.ul,
			getPageWidth: () => context.pageSize.width,
			isLinearNodeListSuppressed: () => context.suppressLinearNodeList,
			processNode: (item) => context.processNode(item),
		});
	},
};
