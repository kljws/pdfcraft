import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutTable, type TableLayoutHost } from "./layout-table";
import { measureTable } from "./measure-table";
import { preprocessTable, type TablePreprocessContext } from "./preprocess-table";
import type {
	LayoutTableNode,
	MeasuredTableNode,
	PreprocessedTableNode,
	TableMeasureNode,
} from "./table.types";

/** Shared row layout supplied by composition to tables. */
export type TableLayoutCapabilities = Pick<TableLayoutHost, "processRow">;

type TableLayoutFeatureContext = NodeLayoutContext & TableLayoutCapabilities;

interface TableFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedTableNode;
	measureNode: TableMeasureNode;
	measuredNode: MeasuredTableNode;
	layoutNode: LayoutTableNode;
	renderNode: never;
	preprocessContext: TablePreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: TableLayoutFeatureContext;
	renderContext: never;
}

interface TableFeature extends NodeFeature<TableFeatureStages> {
	readonly kind: "table";
	preprocess(node: PdfNode, context: TablePreprocessContext): PreprocessedTableNode;
	measure(node: TableMeasureNode, context: NodeMeasureContext): MeasuredTableNode;
	layout(node: LayoutTableNode, context: TableLayoutFeatureContext): void;
}

export const tableFeature: TableFeature = {
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
		const tableHost: TableLayoutHost = {
			writer: context.writer,
			get nestedLevel() {
				return context.nestedLevel;
			},
			set nestedLevel(value) {
				context.nestedLevel = value;
			},
			processRow: (options) => context.processRow(options),
			snakingAwarePageBreak: () => context.snakingAwarePageBreak(),
		};
		layoutTable(node, tableHost);
	},
};
