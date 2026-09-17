import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutColumns, type ColumnsLayoutContext } from "./layout-columns";
import { measureColumns, type ColumnsMeasureContext } from "./measure-columns";
import { preprocessColumns, type ColumnsPreprocessContext } from "./preprocess-columns";
import type {
	LayoutColumnsNode,
	MeasuredColumnsNode,
	PreprocessedColumnsNode,
} from "./columns.types";

interface ColumnsFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedColumnsNode;
	measuredNode: MeasuredColumnsNode;
	layoutNode: LayoutColumnsNode;
	renderNode: never;
	preprocessContext: ColumnsPreprocessContext;
	measureContext: ColumnsMeasureContext;
	layoutContext: ColumnsLayoutContext;
	renderContext: never;
}

interface ColumnsFeature extends NodeFeature<ColumnsFeatureStages> {
	preprocess(node: PdfNode, context: ColumnsPreprocessContext): PreprocessedColumnsNode;
	measure(node: MeasuredColumnsNode, context: ColumnsMeasureContext): MeasuredColumnsNode;
	layout(node: LayoutColumnsNode, context: ColumnsLayoutContext): void;
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
