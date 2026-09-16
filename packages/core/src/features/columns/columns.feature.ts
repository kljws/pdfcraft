import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutColumns, type ColumnsLayoutContext } from "./layout-columns";
import { measureColumns, type ColumnsMeasureContext } from "./measure-columns";
import { preprocessColumns, type ColumnsPreprocessContext } from "./preprocess-columns";

interface ColumnsFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: never;
	preprocessContext: ColumnsPreprocessContext;
	measureContext: ColumnsMeasureContext;
	layoutContext: ColumnsLayoutContext;
	renderContext: never;
}

interface ColumnsFeature extends NodeFeature<ColumnsFeatureStages> {
	measure(node: MeasuredPdfNode, context: ColumnsMeasureContext): MeasuredPdfNode;
	layout(node: LayoutPdfNode, context: ColumnsLayoutContext): void;
}

export const columnsFeature: ColumnsFeature = {
	kind: "columns",
	matches(node): boolean {
		return Boolean(node.columns);
	},
	preprocess: preprocessColumns,
	measure: measureColumns,
	layout: layoutColumns,
};
