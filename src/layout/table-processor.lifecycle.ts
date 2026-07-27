import type PageElementWriter from "./element-writer.page";
import ColumnCalculator from "./column-calculator";
import type { LayoutPdfNode, PdfPage, TableOffsets, TableRowGroupRange } from "../types/internal";
import { isPositiveInteger } from "../utils/variable-type";
import {
	createRowSpanData,
	getTableInnerContentWidth,
	hasExplicitPageBreak,
	propagateCellBorders,
} from "./table-processor.helpers";
import type {
	ResolvedTableLayout,
	RowSpanData,
	TablePageVectorRegistry,
} from "./table-processor.types";

export interface TableLifecycleState {
	tableNode: LayoutPdfNode;
	_isCurrentRowUnbreakable: boolean;
	_currentRowGroup?: TableRowGroupRange;
	offsets: TableOffsets;
	layout: ResolvedTableLayout;
	headerLayout: ResolvedTableLayout;
	bodyLayout: ResolvedTableLayout;
	tableWidth: number;
	borderRadius: number;
	roundedTopByPage: Map<number, number>;
	vectorRegistryByPage: Map<PdfPage, TablePageVectorRegistry>;
	tableOffset: number;
	rowSpanData: RowSpanData[];
	rowGroupsByRow: Array<TableRowGroupRange | undefined>;
	cleanUpRepeatables: boolean;
	headerRows: number;
	rowsWithoutPageBreak: number;
	dontBreakRows: boolean;
	topLineWidth: number;
	rowPaddingTop: number;
	bottomLineWidth: number;
	rowPaddingBottom: number;
	rowCallback: () => void;
	_tableTopBorderY?: number;
	rowTopPageY: number;
	rowTopY: number;
	rowXOffset: number;
	reservedAtBottom: number;
	drawHorizontalLine(lineIndex: number, writer: PageElementWriter): void;
}

export function beginTable(processor: TableLifecycleState, writer: PageElementWriter): void {
	const tableNode = processor.tableNode;
	const table = tableNode.table!;
	processor.offsets = tableNode._offsets!;
	processor.layout = tableNode._layout as ResolvedTableLayout;
	processor.headerLayout = (tableNode._headerLayout ?? tableNode._layout) as ResolvedTableLayout;
	processor.bodyLayout = (tableNode._bodyLayout ?? tableNode._layout) as ResolvedTableLayout;

	const contextWidth = writer.context().availableWidth;
	const availableWidth = contextWidth - processor.offsets.total;
	ColumnCalculator.buildColumnWidths(
		table.widths,
		availableWidth,
		processor.offsets.total,
		tableNode,
	);
	processor.tableWidth = processor.offsets.total + getTableInnerContentWidth(tableNode);
	processor.borderRadius = Math.min(
		Number.isFinite(table.borderRadius) ? Math.max(0, table.borderRadius ?? 0) : 0,
		processor.tableWidth / 2,
	);
	processor.roundedTopByPage.clear();
	processor.vectorRegistryByPage.clear();
	const remainingWidth = Math.max(0, contextWidth - processor.tableWidth);
	processor.tableOffset =
		tableNode._tableAlignment === "right"
			? remainingWidth
			: tableNode._tableAlignment === "center"
				? remainingWidth / 2
				: 0;
	processor.rowSpanData = createRowSpanData(tableNode, processor.layout, processor.tableOffset);
	processor.rowGroupsByRow = Array(table.body.length);
	for (const group of table._rowGroups ?? []) {
		for (let rowIndex = group.startRow; rowIndex <= group.endRow; rowIndex++) {
			processor.rowGroupsByRow[rowIndex] = group;
		}
	}
	processor.cleanUpRepeatables = false;
	processor.headerRows = 0;
	processor.rowsWithoutPageBreak = 0;

	if (isPositiveInteger(table.headerRows)) {
		processor.headerRows = table.headerRows;
		if (processor.headerRows > table.body.length) {
			throw new Error(
				`Too few rows in the table. Property headerRows requires at least ${processor.headerRows}, contains only ${table.body.length}`,
			);
		}
		processor.rowsWithoutPageBreak = processor.headerRows;
		const firstBodyGroup = table._rowGroups?.find(
			(group) => group.startRow === processor.headerRows,
		);
		if (firstBodyGroup?.keepTogether) {
			processor.rowsWithoutPageBreak = firstBodyGroup.endRow + 1;
		}
		if (isPositiveInteger(table.keepWithHeaderRows)) {
			processor.rowsWithoutPageBreak += table.keepWithHeaderRows;
		}
	}
	processor.layout = processor.headerRows ? processor.headerLayout : processor.bodyLayout;

	processor.dontBreakRows = table.dontBreakRows || false;
	if (processor.rowsWithoutPageBreak || processor.dontBreakRows) {
		writer.beginUnbreakableBlock();
		processor.drawHorizontalLine(0, writer);
		if (processor.rowsWithoutPageBreak && processor.dontBreakRows) {
			writer.beginUnbreakableBlock();
		}
	}

	propagateCellBorders(table.body);
}

export function beginTableRow(
	processor: TableLifecycleState,
	rowIndex: number,
	writer: PageElementWriter,
): void {
	processor.layout =
		rowIndex < processor.headerRows
			? (processor.headerLayout ?? processor.layout)
			: (processor.bodyLayout ?? processor.layout);
	const rowGroup = processor.rowGroupsByRow[rowIndex];
	processor._currentRowGroup = rowGroup;
	if (rowGroup?.keepTogether && rowIndex === rowGroup.startRow) {
		writer.beginUnbreakableBlock();
	}

	processor.topLineWidth = processor.layout.hLineWidth(rowIndex, processor.tableNode);
	processor.rowPaddingTop = processor.layout.paddingTop(rowIndex, processor.tableNode);
	processor.bottomLineWidth = processor.layout.hLineWidth(rowIndex + 1, processor.tableNode);
	processor.rowPaddingBottom = processor.layout.paddingBottom(rowIndex, processor.tableNode);
	const context = writer.context();
	const currentPage =
		typeof context.getCurrentPage === "function" ? context.getCurrentPage() : undefined;
	processor.rowXOffset =
		context.x - (currentPage?.pageMargins.left ?? context.pageMargins?.left ?? 0);

	processor.rowCallback = () => {
		const offset = processor.rowPaddingTop + (!processor.headerRows ? processor.topLineWidth : 0);
		writer.context().availableHeight -= processor.reservedAtBottom;
		writer.context().moveDown(offset);
	};
	writer.addListener("pageChanged", processor.rowCallback);
	if (rowIndex === 0 && !processor.dontBreakRows && !processor.rowsWithoutPageBreak) {
		processor._tableTopBorderY = writer.context().y;
		writer.context().moveDown(processor.topLineWidth);
	}

	processor.rowTopPageY = writer.context().y + processor.rowPaddingTop;
	const rowCells = processor.tableNode.table!.body[rowIndex] || [];
	const rowHasPageBreak = rowCells.some(hasExplicitPageBreak);
	const rowMustNotBreak = processor.dontBreakRows || rowGroup?.dontBreakRows === true;
	processor._isCurrentRowUnbreakable =
		rowMustNotBreak && !(processor.dontBreakRows && rowIndex === 0) && !rowHasPageBreak;
	if (processor._isCurrentRowUnbreakable) writer.beginUnbreakableBlock();

	processor.rowTopY = writer.context().y;
	processor.reservedAtBottom = processor.bottomLineWidth + processor.rowPaddingBottom;
	writer.context().availableHeight -= processor.reservedAtBottom;
	writer.context().moveDown(processor.rowPaddingTop);
}
