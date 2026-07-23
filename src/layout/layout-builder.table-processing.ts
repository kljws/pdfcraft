import type PageElementWriter from "./element-writer.page";
import type { LayoutPdfNode, PdfTable } from "../types/internal";
import { addAll } from "./layout-builder.helpers";
import TableProcessor from "./table-processor";
import {
	findSameRowPageBreakByRowSpanData,
	getPageBreakListBySpan,
	type TablePageBreak,
} from "./layout-builder.table";
import type { ProcessRowOptions, ProcessRowResult } from "./layout-builder.rows";

export interface TableLayoutHost {
	writer: PageElementWriter;
	nestedLevel: number;
	processRow(options: ProcessRowOptions): ProcessRowResult;
	snakingAwarePageBreak(): void;
}

function getRowHeight(
	heights: PdfTable<LayoutPdfNode>["heights"],
	rowIndex: number,
): number | undefined {
	const height =
		typeof heights === "function"
			? heights(rowIndex)
			: Array.isArray(heights)
				? heights[rowIndex]
				: heights;
	return height === "auto" ? undefined : height;
}

export function processTable(host: TableLayoutHost, tableNode: LayoutPdfNode): void {
	host.nestedLevel++;
	const processor = new TableProcessor(tableNode);
	processor.beginTable(host.writer);

	const table = tableNode.table!;
	let lastRowHeight = 0;
	for (let rowIndex = 0; rowIndex < table.body.length; rowIndex++) {
		const rowHeight = getRowHeight(table.heights, rowIndex);
		if (rowIndex > 0 && host.writer.context().inSnakingColumns()) {
			const minimumRowHeight =
				lastRowHeight ||
				processor.rowPaddingTop +
					14 +
					processor.rowPaddingBottom +
					processor.bottomLineWidth +
					processor.topLineWidth;
			if (host.writer.context().availableHeight < minimumRowHeight) {
				host.snakingAwarePageBreak();
				if (processor.layout.hLineWhenBroken !== false && !processor.headerRows) {
					processor.drawHorizontalLine(rowIndex, host.writer);
				}
			}
		}

		const isUnbreakableRow =
			processor.dontBreakRows || rowIndex <= processor.rowsWithoutPageBreak - 1;
		if (!isUnbreakableRow && rowHeight !== undefined) {
			const context = host.writer.context();
			const page = context.getCurrentPage();
			const rowOverhead =
				processor.layout.paddingTop(rowIndex, tableNode) +
				processor.layout.paddingBottom(rowIndex, tableNode) +
				processor.layout.hLineWidth(rowIndex + 1, tableNode) +
				(rowIndex === 0 ? processor.layout.hLineWidth(0, tableNode) : 0);
			const requiredHeight = rowHeight + rowOverhead;
			const fullPageHeight = page.pageSize.height - page.pageMargins.top - page.pageMargins.bottom;
			if (requiredHeight > context.availableHeight && requiredHeight <= fullPageHeight) {
				context.moveDown(context.availableHeight);
				if (context.inSnakingColumns()) {
					host.snakingAwarePageBreak();
				} else {
					host.writer.moveToNextPage();
				}
				if (rowIndex > 0 && !processor.headerRows && processor.layout.hLineWhenBroken !== false) {
					processor.drawHorizontalLine(rowIndex, host.writer);
				}
			}
		}

		const rowYBefore = host.writer.context().y;
		if (processor.dontBreakRows) {
			for (const cell of table.body[rowIndex]) {
				if (cell.rowSpan && cell.rowSpan > 1) {
					cell._startingRowSpanY = host.writer.context().y;
					cell._startingRowSpanPage = host.writer.context().page;
				}
			}
		}

		processor.beginRow(rowIndex, host.writer);
		const pageBeforeProcessing = host.writer.context().page;
		const columnOffsets = [...tableNode._offsets!.offsets];
		columnOffsets[0] = (columnOffsets[0] ?? 0) + processor.tableOffset;
		const result = host.processRow({
			marginX: tableNode._margin ? [tableNode._margin[0], tableNode._margin[2]] : [0, 0],
			dontBreakRows: processor.dontBreakRows,
			rowsWithoutPageBreak: processor.rowsWithoutPageBreak,
			cells: table.body[rowIndex],
			widths: table.widths,
			gaps: columnOffsets,
			tableBody: table.body,
			tableNode,
			rowIndex,
			height: rowHeight,
		});

		addAll(tableNode.positions!, result.positions);
		if (result.pageBreaks.length === 0) {
			const breaksBySpan = tableNode._breaksBySpan as TablePageBreak[] | undefined;
			const breakData = findSameRowPageBreakByRowSpanData(
				breaksBySpan,
				pageBeforeProcessing,
				rowIndex,
			);
			if (breakData) {
				const finalBreak = getPageBreakListBySpan(tableNode, breakData.prevPage, rowIndex);
				if (finalBreak) result.pageBreaks.push(finalBreak);
			}
		}

		processor.endRow(rowIndex, host.writer, result.pageBreaks);
		if (host.writer.context().page === pageBeforeProcessing) {
			lastRowHeight = host.writer.context().y - rowYBefore;
		}
	}

	processor.endTable(host.writer);
	host.nestedLevel--;
	if (host.nestedLevel === 0) host.writer.context().resetMarginXTopParent();
}
