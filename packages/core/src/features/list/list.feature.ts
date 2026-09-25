import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type StyleContextStack from "../../services/styles/style-context-stack";
import type { TextSize } from "../../services/typography/text-metrics";
import type { Color } from "../../types";
import type { Inline, LayoutPdfNode, PdfNode } from "../../types/internal";
import { layoutList } from "./layout-list";
import type {
	LayoutListNode,
	ListMeasureNode,
	MeasuredListNode,
	PreprocessedListNode,
	LayoutListItem,
} from "./list.types";
import { measureOrderedList, measureUnorderedList, type ListMeasureContext } from "./measure-list";
import { preprocessList, type ListPreprocessContext } from "./preprocess-list";

/** Marker text measurement supplied by the inline text pipeline through composition. */
export interface ListMeasureCapabilities {
	readonly inlines: {
		sizeOfText(text: string, styles: StyleContextStack): TextSize;
		buildInlines(
			text: { text: string; color: Color },
			styles: StyleContextStack,
		): { items: Inline[] };
	};
}

type ListMeasureFeatureContext = NodeMeasureContext & ListMeasureCapabilities;

interface ListFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedListNode;
	measureNode: ListMeasureNode;
	measuredNode: MeasuredListNode;
	layoutNode: LayoutListNode;
	renderNode: never;
	preprocessContext: ListPreprocessContext;
	measureContext: ListMeasureFeatureContext;
	layoutContext: NodeLayoutContext;
	renderContext: never;
}

interface ListFeature extends NodeFeature<ListFeatureStages> {
	readonly kind: "list";
	preprocess(node: PdfNode, context: ListPreprocessContext): PreprocessedListNode;
	measure(node: ListMeasureNode, context: ListMeasureFeatureContext): MeasuredListNode;
	layout(node: LayoutListNode, context: NodeLayoutContext): void;
	hasMarker(node: LayoutPdfNode): boolean;
}

export const listFeature = {
	kind: "list",
	/** Whether list measurement attached a marker to this item. */
	hasMarker(node): boolean {
		return Boolean((node as LayoutListItem).listMarker);
	},
	matches(node): boolean {
		return Boolean(node.ul || node.ol);
	},
	preprocess: preprocessList,
	measure(node, context): MeasuredListNode {
		const measureContext: ListMeasureContext = {
			styles: context.styles,
			measureNode: context.measureNode,
			measureGap: () => context.inlines.sizeOfText("9. ", context.styles),
			buildMarkerInlines: (text, color, styles) =>
				context.inlines.buildInlines({ text, color }, styles).items,
		};
		return node.ul
			? measureUnorderedList(node, measureContext)
			: measureOrderedList(node, measureContext);
	},
	layout(node, context): void {
		const listNode = node;
		layoutList(listNode, {
			writer: context.writer,
			ordered: !listNode.ul,
			getPageWidth: () => context.pageSize.width,
			isLinearNodeListSuppressed: () => context.suppressLinearNodeList,
			processNode: (item) => context.processNode(item),
		});
	},
} satisfies ListFeature;
