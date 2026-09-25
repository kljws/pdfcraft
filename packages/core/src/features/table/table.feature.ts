import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type {
	LayoutPdfNode,
	MeasurePdfNode,
	PdfNode,
	PreprocessedPdfNode,
} from "../../types/internal";
import { layoutTable, type TableLayoutHost } from "./layout-table";
import { measureTable } from "./measure-table";
import { preprocessTable, type TablePreprocessContext } from "./preprocess-table";
import type {
	LayoutTableNode,
	MeasuredTableNode,
	PreprocessedTableNode,
	TableMeasureNode,
	LayoutTableCell,
} from "./table.types";

/** Shared row layout supplied by composition to tables. */
export type TableLayoutCapabilities = Pick<TableLayoutHost, "processRow">;

type TableLayoutFeatureContext = NodeLayoutContext & TableLayoutCapabilities;

interface TableFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedTableNode;
	measureNode: MeasurePdfNode;
	measuredNode: TableMeasureNode;
	layoutNode: LayoutTableNode;
	renderNode: never;
	preprocessContext: TablePreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: TableLayoutFeatureContext;
	renderContext: never;
}

interface TableFeature extends NodeFeature<TableFeatureStages> {
	readonly kind: "table";
	isSpanPlaceholder(node: LayoutPdfNode): boolean;
	preprocess(node: PdfNode, context: TablePreprocessContext): PreprocessedTableNode;
	measure(node: MeasurePdfNode, context: NodeMeasureContext): MeasuredTableNode;
	layout(node: LayoutTableNode, context: TableLayoutFeatureContext): void;
}

export const tableFeature: TableFeature = {
	kind: "table",
	/** Whether the node only reserves space covered by a spanning cell and has no content. */
	isSpanPlaceholder(node): boolean {
		return Boolean((node as LayoutTableCell)._span);
	},
	matches(node): boolean {
		return Boolean(node.table);
	},
	preprocess: preprocessTable,
	measure(node, context): MeasuredTableNode {
		return measureTable(node as TableMeasureNode, {
			styles: context.styles,
			tableLayouts: context.tableLayouts,
			measureNode: (cell) => context.measureNode(cell as unknown as PreprocessedPdfNode),
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
