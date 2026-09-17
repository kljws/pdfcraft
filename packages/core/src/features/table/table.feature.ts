import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutTable, type TableLayoutHost } from "./layout-table";
import { measureTable, type TableMeasureContext } from "./measure-table";
import { preprocessTable, type TablePreprocessContext } from "./preprocess-table";
import type {
	LayoutTableNode,
	MeasuredTableNode,
	PreprocessedTableNode,
	TableMeasureNode,
} from "./table.types";

interface TableFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedTableNode;
	measuredNode: TableMeasureNode;
	layoutNode: LayoutTableNode;
	renderNode: never;
	preprocessContext: TablePreprocessContext;
	measureContext: TableMeasureContext;
	layoutContext: TableLayoutHost;
	renderContext: never;
}

interface TableFeature extends NodeFeature<TableFeatureStages> {
	preprocess(node: PdfNode, context: TablePreprocessContext): PreprocessedTableNode;
	measure(node: TableMeasureNode, context: TableMeasureContext): MeasuredTableNode;
	layout(node: LayoutTableNode, context: TableLayoutHost): void;
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
