import ColumnCalculator from "../../layout/column-calculator";
import type StyleContextStack from "../../services/styles/style-context-stack";
import type { Color, Dictionary } from "../../types";
import type { TableLayout } from "../../types/internal";
import { stringifyNode } from "../../utils/node";
import { isObject } from "../../utils/variable-type";
import {
	combineTableLayouts,
	extendTableWidths,
	extendWidthsForColumnSpans,
	getTableOffsets,
	markColumnSpans,
	markRowSpans,
	resolveTableLayout,
	resolveTableRowGroupLayout,
} from "./measure-table.helpers";
import type { MeasuredTableCell, MeasuredTableNode, TableMeasureNode } from "./table.types";

export interface TableMeasureContext {
	styles: StyleContextStack;
	tableLayouts: Dictionary<Partial<TableLayout<MeasuredTableCell>>>;
	measureNode(node: MeasuredTableCell): MeasuredTableCell;
}

export function measureTable(
	node: TableMeasureNode,
	context: TableMeasureContext,
): MeasuredTableNode {
	extendTableWidths(node);
	const table = node.table!;
	const tableAlignment = context.styles.getProperty("tableAlignment");
	node._tableAlignment =
		tableAlignment === "center" || tableAlignment === "right" ? tableAlignment : "left";
	node._headerLayout = resolveTableLayout(node, context.tableLayouts, table._headerLayout);
	node._bodyLayout = resolveTableLayout(node, context.tableLayouts, table._bodyLayout);
	const bodyLayout = node._bodyLayout;
	for (const group of table._rowGroups ?? []) {
		group.layout = resolveTableRowGroupLayout(node, bodyLayout, group);
	}
	const layout = combineTableLayouts(
		node._headerLayout,
		bodyLayout,
		(table._rowGroups ?? []).map((group) => group.layout ?? bodyLayout),
	);
	const measuredNode = node as MeasuredTableNode;
	const offsets = getTableOffsets(measuredNode, layout);
	measuredNode.metrics = {
		layout,
		offsets,
	};

	const colSpans: Array<{ col: number; span: number; minWidth: number; maxWidth: number }> = [];
	let col;
	let row;
	let cols;
	let rows;

	for (col = 0, cols = table.body[0].length; col < cols; col++) {
		const column = table.widths[col];
		column._minWidth = 0;
		column._maxWidth = 0;

		for (row = 0, rows = table.body.length; row < rows; row++) {
			const rowData = table.body[row];
			let data = rowData[col];
			if (data === undefined) {
				throw new Error(
					`Malformed table row, a cell is undefined.\nRow index: ${row}\nColumn index: ${col}\nRow data: ${stringifyNode(rowData)}`,
				);
			}
			if (!data._span) {
				data = rowData[col] = context.styles.auto(data, measureCell(data));

				if (data.colSpan && data.colSpan > 1) {
					markColumnSpans(rowData, col, data.colSpan);
					colSpans.push({
						col,
						span: data.colSpan,
						minWidth: data._minWidth ?? 0,
						maxWidth: data._maxWidth ?? 0,
					});
				} else {
					column._minWidth = Math.max(column._minWidth, data._minWidth ?? 0);
					column._maxWidth = Math.max(column._maxWidth, data._maxWidth ?? 0);
				}
			}

			if (data.rowSpan && data.rowSpan > 1) {
				markRowSpans(table, row, col, data.rowSpan);
			}
		}
	}

	extendWidthsForColumnSpans(measuredNode, colSpans);

	const measures = ColumnCalculator.measureMinMax(table.widths);
	node._minWidth = measures.min + measuredNode.metrics.offsets.total;
	node._maxWidth = measures.max + measuredNode.metrics.offsets.total;

	return measuredNode;

	function measureCell(data: MeasuredTableCell): () => MeasuredTableCell {
		return () => {
			if (isObject(data)) {
				data.border = context.styles.getProperty("border") as
					| [boolean, boolean, boolean, boolean]
					| undefined;
				data.borderColor = context.styles.getProperty("borderColor") as
					| [Color, Color, Color, Color]
					| undefined;
				data.fillColor = context.styles.getProperty("fillColor") as Color | undefined;
				const fillOpacity = context.styles.getProperty("fillOpacity");
				data.fillOpacity = typeof fillOpacity === "number" ? fillOpacity : undefined;
			}
			return context.measureNode(data as unknown as MeasuredTableCell);
		};
	}
}
