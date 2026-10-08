import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutColumns } from "./layout-columns";
import { measureColumns } from "./measure-columns";
import { preprocessColumns, type ColumnsPreprocessContext } from "./preprocess-columns";
import type {
	LayoutColumnsNode,
	MeasuredColumnsNode,
	PreprocessedColumnsNode,
} from "./columns.types";

type ColumnsFeatureStages = NodeFeatureStages & {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedColumnsNode;
	measuredNode: MeasuredColumnsNode;
	layoutNode: LayoutColumnsNode;
	preprocessContext: ColumnsPreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
};

type ColumnsFeature = NodeFeature<ColumnsFeatureStages> & {
	readonly kind: "columns";
	preprocess(node: PdfNode, context: ColumnsPreprocessContext): PreprocessedColumnsNode;
	measure(node: MeasuredColumnsNode, context: NodeMeasureContext): MeasuredColumnsNode;
	layout(node: LayoutColumnsNode, context: NodeLayoutContext): void;
};

export const columnsFeature = {
	kind: "columns",
	contentKeys: ["columns"],
	matches(node): boolean {
		return Boolean(node.columns);
	},
	preprocess: preprocessColumns,
	measure(node, context): MeasuredColumnsNode {
		return measureColumns(node, context);
	},
	layout(node, context): void {
		layoutColumns(node, {
			writer: context.writer,
			enterNestedLevel: () => ++context.nestedLevel,
			leaveNestedLevel: () => --context.nestedLevel,
			processNode: (column, isVerticalAlignmentAllowed) =>
				context.processNode(column, isVerticalAlignmentAllowed),
		});
	},
} satisfies ColumnsFeature;
