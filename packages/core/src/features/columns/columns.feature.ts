import type { NodeFeature, NodeFeatureStages, NodeLayoutContext, NodeMeasureContext } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasurePdfNode, PdfNode } from "../../types/internal";
import { layoutColumns } from "./layout-columns";
import { measureColumns } from "./measure-columns";
import { preprocessColumns, type ColumnsPreprocessContext } from "./preprocess-columns";
import type {
	LayoutColumnsNode,
	MeasuredColumnsNode,
	PreprocessedColumnsNode,
} from "./columns.types";

interface ColumnsFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedColumnsNode;
	measureNode: MeasurePdfNode;
	measuredNode: MeasuredColumnsNode;
	layoutNode: LayoutColumnsNode;
	renderNode: never;
	preprocessContext: ColumnsPreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: never;
}

interface ColumnsFeature extends NodeFeature<ColumnsFeatureStages> {
	readonly kind: "columns";
	preprocess(node: PdfNode, context: ColumnsPreprocessContext): PreprocessedColumnsNode;
	measure(node: MeasurePdfNode, context: NodeMeasureContext): MeasuredColumnsNode;
	layout(node: LayoutPdfNode, context: NodeLayoutContext): void;
}

export const columnsFeature: ColumnsFeature = {
	kind: "columns",
	matches(node): boolean {
		return Boolean(node.columns);
	},
	preprocess: preprocessColumns,
	measure(node, context): MeasuredColumnsNode {
		return measureColumns(node as MeasuredColumnsNode, {
			styles: context.styles,
			measureChild: (item) => context.measureNode(item),
		});
	},
	layout(node, context): void {
		layoutColumns(node as LayoutColumnsNode, {
			writer: context.writer,
			enterNestedLevel: () => ++context.nestedLevel,
			leaveNestedLevel: () => --context.nestedLevel,
			processRow: (options) => context.processRow(options),
		});
	},
};
