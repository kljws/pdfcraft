import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import TableRowLayout from "./layout-row";
import { layoutTable } from "./layout-table";
import { measureTable } from "./measure-table";
import { preprocessTable, type TablePreprocessContext } from "./preprocess-table";
import type {
	LayoutTableNode,
	MeasuredTableNode,
	PreprocessedTableNode,
	TableMeasureNode,
} from "./table.types";

type TableFeatureStages = NodeFeatureStages & {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedTableNode;
	measureNode: TableMeasureNode;
	measuredNode: MeasuredTableNode;
	layoutNode: LayoutTableNode;
	preprocessContext: TablePreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
};

type TableFeature = NodeFeature<TableFeatureStages> & {
	readonly kind: "table";
	preprocess(node: PdfNode, context: TablePreprocessContext): PreprocessedTableNode;
	measure(node: TableMeasureNode, context: NodeMeasureContext): MeasuredTableNode;
	layout(node: LayoutTableNode, context: NodeLayoutContext): void;
};

export const tableFeature = {
	kind: "table",
	matches(node): boolean {
		return Boolean(node.table);
	},
	preprocess: preprocessTable,
	measure(node, context): MeasuredTableNode {
		return measureTable(node, {
			styles: context.styles,
			tableLayouts: context.tableLayouts,
			measureNode: (cell) => context.measureNode(cell),
		});
	},
	layout(node, context): void {
		const rows = new TableRowLayout({
			get writer() {
				return context.writer;
			},
			get nestedLevel() {
				return context.nestedLevel;
			},
			processNode: (cell, isVerticalAlignmentAllowed) =>
				context.processNode(cell, isVerticalAlignmentAllowed),
		});
		layoutTable(node, {
			get writer() {
				return context.writer;
			},
			get nestedLevel() {
				return context.nestedLevel;
			},
			set nestedLevel(value) {
				context.nestedLevel = value;
			},
			processRow: (options) => rows.processRow(options),
			isInFlow: () => context.isInFlow(),
			advanceToNextRegion: () => {
				context.advanceFlowRegion(undefined, { throughNestedGroups: true });
			},
		});
	},
} satisfies TableFeature;
