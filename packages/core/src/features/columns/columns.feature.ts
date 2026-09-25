import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutColumns, type ColumnsLayoutContext } from "./layout-columns";
import { measureColumns } from "./measure-columns";
import { preprocessColumns, type ColumnsPreprocessContext } from "./preprocess-columns";
import type {
	LayoutColumnsNode,
	MeasuredColumnsNode,
	PreprocessedColumnsNode,
} from "./columns.types";

/** Shared row layout supplied by composition to columns. */
export type ColumnsLayoutCapabilities = Pick<ColumnsLayoutContext, "processRow">;

type ColumnsLayoutFeatureContext = NodeLayoutContext & ColumnsLayoutCapabilities;

interface ColumnsFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedColumnsNode;
	measureNode: MeasuredColumnsNode;
	measuredNode: MeasuredColumnsNode;
	layoutNode: LayoutColumnsNode;
	renderNode: never;
	preprocessContext: ColumnsPreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: ColumnsLayoutFeatureContext;
	renderContext: never;
}

interface ColumnsFeature extends NodeFeature<ColumnsFeatureStages> {
	readonly kind: "columns";
	preprocess(node: PdfNode, context: ColumnsPreprocessContext): PreprocessedColumnsNode;
	measure(node: MeasuredColumnsNode, context: NodeMeasureContext): MeasuredColumnsNode;
	layout(node: LayoutColumnsNode, context: ColumnsLayoutFeatureContext): void;
}

export const columnsFeature: ColumnsFeature = {
	kind: "columns",
	matches(node): boolean {
		return Boolean(node.columns);
	},
	preprocess: preprocessColumns,
	measure(node, context): MeasuredColumnsNode {
		return measureColumns(node, {
			styles: context.styles,
			measureChild: (item) => context.measureNode(item),
		});
	},
	layout(node, context): void {
		layoutColumns(node, {
			writer: context.writer,
			enterNestedLevel: () => ++context.nestedLevel,
			leaveNestedLevel: () => --context.nestedLevel,
			processRow: (options) => context.processRow(options),
		});
	},
};
