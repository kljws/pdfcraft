import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutTable, type TableLayoutHost } from "./layout-table";
import { measureTable, type TableMeasureContext } from "./measure-table";
import { preprocessTable, type TablePreprocessContext } from "./preprocess-table";

interface TableFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: never;
	preprocessContext: TablePreprocessContext;
	measureContext: TableMeasureContext;
	layoutContext: TableLayoutHost;
	renderContext: never;
}

interface TableFeature extends NodeFeature<TableFeatureStages> {
	measure(node: MeasuredPdfNode, context: TableMeasureContext): MeasuredPdfNode;
	layout(node: LayoutPdfNode, context: TableLayoutHost): void;
}

export const tableFeature: TableFeature = {
	kind: "table",
	matches(node): boolean {
		return Boolean(node.table);
	},
	preprocess: preprocessTable,
	measure: measureTable,
	layout: layoutTable,
};
