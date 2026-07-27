import { defaultTableLayout } from "../configuration/table-layouts";
import type { Dictionary } from "../types";
import type { TableLayoutNode, TableRowGroupLayout, TableRowGroupLayoutContext } from "../types";
import type {
	ColumnWidth,
	MeasuredPdfNode,
	PdfTable,
	RawColumnWidth,
	TableLayout,
	TableRowGroupRange,
} from "../types/internal";
import { pack } from "../utils/tools";
import { isNumber, isObject, isString } from "../utils/variable-type";

export function resolveTableLayout(
	node: MeasuredPdfNode,
	tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>,
	layoutDefinition: unknown = node.layout,
): TableLayout<MeasuredPdfNode> {
	const layout = isString(layoutDefinition) ? tableLayouts[layoutDefinition] : layoutDefinition;
	return pack<TableLayout<MeasuredPdfNode>>(
		defaultTableLayout,
		isObject(layout) ? (layout as Partial<TableLayout>) : undefined,
	);
}

export function resolveTableRowGroupLayout(
	node: MeasuredPdfNode,
	bodyLayout: TableLayout<MeasuredPdfNode>,
	group: TableRowGroupRange<MeasuredPdfNode>,
): TableLayout<MeasuredPdfNode> {
	const definition = group.layoutDefinition as TableRowGroupLayout | undefined;
	if (!definition) return bodyLayout;
	const context: TableRowGroupLayoutContext = {
		groupIndex: group.groupIndex,
		rowCount: group.endRow - group.startRow + 1,
		startRow: group.startRow,
		endRow: group.endRow,
	};
	const publicNode = node as unknown as TableLayoutNode;
	const isInternalHorizontalBoundary = (index: number): boolean =>
		index > group.startRow && index <= group.endRow;
	const isInternalVerticalBoundary = (index: number): boolean =>
		index > 0 && index < (node.table?.widths.length ?? 0);
	const localRow = (index: number): number => index - group.startRow;
	const localBoundary = (index: number): number => index - group.startRow;

	return {
		...bodyLayout,
		hLineWidth: (index, layoutNode) =>
			definition.hLineWidth && isInternalHorizontalBoundary(index)
				? definition.hLineWidth(localBoundary(index), publicNode, context)
				: bodyLayout.hLineWidth(index, layoutNode),
		vLineWidth: (index, layoutNode) =>
			definition.vLineWidth && isInternalVerticalBoundary(index)
				? definition.vLineWidth(index, publicNode, context)
				: bodyLayout.vLineWidth(index, layoutNode),
		hLineColor: (index, layoutNode, columnIndex) => {
			if (definition.hLineColor !== undefined && isInternalHorizontalBoundary(index)) {
				return typeof definition.hLineColor === "function"
					? definition.hLineColor(localBoundary(index), publicNode, columnIndex, context)
					: definition.hLineColor;
			}
			return bodyLayout.hLineColor(index, layoutNode, columnIndex);
		},
		vLineColor: (index, layoutNode, rowIndex) => {
			if (definition.vLineColor !== undefined && isInternalVerticalBoundary(index)) {
				return typeof definition.vLineColor === "function"
					? definition.vLineColor(
							index,
							publicNode,
							rowIndex === undefined ? undefined : localRow(rowIndex),
							context,
						)
					: definition.vLineColor;
			}
			return bodyLayout.vLineColor(index, layoutNode, rowIndex);
		},
		paddingLeft: (index, layoutNode) =>
			definition.paddingLeft
				? definition.paddingLeft(index, publicNode, context)
				: bodyLayout.paddingLeft(index, layoutNode),
		paddingRight: (index, layoutNode) =>
			definition.paddingRight
				? definition.paddingRight(index, publicNode, context)
				: bodyLayout.paddingRight(index, layoutNode),
		paddingTop: (index, layoutNode) =>
			definition.paddingTop
				? definition.paddingTop(localRow(index), publicNode, context)
				: bodyLayout.paddingTop(index, layoutNode),
		paddingBottom: (index, layoutNode) =>
			definition.paddingBottom
				? definition.paddingBottom(localRow(index), publicNode, context)
				: bodyLayout.paddingBottom(index, layoutNode),
		hLineStyle: (index, layoutNode) =>
			definition.hLineStyle && isInternalHorizontalBoundary(index)
				? definition.hLineStyle(localBoundary(index), publicNode, context)
				: bodyLayout.hLineStyle?.(index, layoutNode),
		vLineStyle: (index, layoutNode) =>
			definition.vLineStyle && isInternalVerticalBoundary(index)
				? definition.vLineStyle(index, publicNode, context)
				: bodyLayout.vLineStyle?.(index, layoutNode),
		hLineWhenBroken: bodyLayout.hLineWhenBroken,
	};
}

export function combineTableLayouts(
	headerLayout: TableLayout<MeasuredPdfNode>,
	bodyLayout: TableLayout<MeasuredPdfNode>,
	groupLayouts: TableLayout<MeasuredPdfNode>[] = [],
): TableLayout<MeasuredPdfNode> {
	const useHeader = (index: number, node: MeasuredPdfNode) =>
		(node.table!.headerRows ?? 0) > 0 && index < (node.table!.headerRows ?? 0);
	const useHeaderBoundary = (index: number, node: MeasuredPdfNode) =>
		(node.table!.headerRows ?? 0) > 0 && index <= (node.table!.headerRows ?? 0);

	return {
		hLineWidth: (index, node) =>
			(useHeaderBoundary(index, node) ? headerLayout : bodyLayout).hLineWidth(index, node),
		vLineWidth: (index, node) =>
			Math.max(
				(node.table!.headerRows ?? 0) > 0 ? headerLayout.vLineWidth(index, node) : 0,
				bodyLayout.vLineWidth(index, node),
				...groupLayouts.map((layout) => layout.vLineWidth(index, node)),
			),
		hLineColor: (index, node, columnIndex) => {
			const layout = useHeaderBoundary(index, node) ? headerLayout : bodyLayout;
			return typeof layout.hLineColor === "function"
				? layout.hLineColor(index, node, columnIndex)
				: layout.hLineColor;
		},
		vLineColor: headerLayout.vLineColor,
		hLineStyle: (index, node) =>
			(useHeaderBoundary(index, node) ? headerLayout : bodyLayout).hLineStyle?.(index, node),
		vLineStyle: (index, node) =>
			headerLayout.vLineStyle?.(index, node) ?? bodyLayout.vLineStyle?.(index, node),
		paddingLeft: (index, node) =>
			Math.max(
				(node.table!.headerRows ?? 0) > 0 ? headerLayout.paddingLeft(index, node) : 0,
				bodyLayout.paddingLeft(index, node),
				...groupLayouts.map((layout) => layout.paddingLeft(index, node)),
			),
		paddingRight: (index, node) =>
			Math.max(
				(node.table!.headerRows ?? 0) > 0 ? headerLayout.paddingRight(index, node) : 0,
				bodyLayout.paddingRight(index, node),
				...groupLayouts.map((layout) => layout.paddingRight(index, node)),
			),
		paddingTop: (index, node) =>
			(useHeader(index, node) ? headerLayout : bodyLayout).paddingTop(index, node),
		paddingBottom: (index, node) =>
			(useHeader(index, node) ? headerLayout : bodyLayout).paddingBottom(index, node),
		fillColor: (rowIndex: number, node: MeasuredPdfNode, columnIndex: number) => {
			const layout = useHeader(rowIndex, node) ? headerLayout : bodyLayout;
			return typeof layout.fillColor === "function"
				? layout.fillColor(rowIndex, node, columnIndex)
				: layout.fillColor;
		},
		fillOpacity: (rowIndex: number, node: MeasuredPdfNode, columnIndex: number) => {
			const layout = useHeader(rowIndex, node) ? headerLayout : bodyLayout;
			return typeof layout.fillOpacity === "function"
				? layout.fillOpacity(rowIndex, node, columnIndex)
				: layout.fillOpacity;
		},
		defaultBorder: headerLayout.defaultBorder || bodyLayout.defaultBorder,
		hLineWhenBroken: bodyLayout.hLineWhenBroken,
	};
}

export interface TableOffsets {
	total: number;
	offsets: number[];
}

export interface ColumnSpanMeasurement {
	col: number;
	span: number;
	minWidth: number;
	maxWidth: number;
}

export function getTableOffsets(
	node: MeasuredPdfNode,
	layout: TableLayout<MeasuredPdfNode>,
): TableOffsets {
	const table = node.table!;
	const offsets: number[] = [];
	let total = 0;
	let previousRightPadding = 0;

	for (let index = 0; index < table.widths.length; index++) {
		const leftOffset =
			previousRightPadding + layout.vLineWidth(index, node) + layout.paddingLeft(index, node);
		offsets.push(leftOffset);
		total += leftOffset;
		previousRightPadding = layout.paddingRight(index, node);
	}

	total += previousRightPadding + layout.vLineWidth(table.widths.length, node);
	return { total, offsets };
}

export function extendWidthsForColumnSpans(
	node: MeasuredPdfNode,
	columnSpans: ColumnSpanMeasurement[],
): void {
	const table = node.table!;
	const offsets = node._offsets!;
	for (const span of columnSpans) {
		const current = getMinMax(node, span.col, span.span, offsets);
		const minimumDifference = span.minWidth - current.minWidth;
		const maximumDifference = span.maxWidth - current.maxWidth;
		const spannedColumns = table.widths.slice(span.col, span.col + span.span);
		const starColumns = spannedColumns.filter(
			(column) =>
				column.width === undefined ||
				column.width === null ||
				column.width === "*" ||
				column.width === "star",
		);
		const autoColumns = spannedColumns.filter((column) => column.width === "auto");
		const expandableColumns =
			starColumns.length > 0 ? starColumns : autoColumns.length > 0 ? autoColumns : spannedColumns;

		if (minimumDifference > 0) {
			const increment = minimumDifference / expandableColumns.length;
			for (const column of expandableColumns) {
				column._minWidth += increment;
			}
		}

		if (maximumDifference > 0) {
			const increment = maximumDifference / expandableColumns.length;
			for (const column of expandableColumns) {
				column._maxWidth += increment;
			}
		}
	}
}

function getMinMax(
	node: MeasuredPdfNode,
	column: number,
	span: number,
	offsets: TableOffsets,
): { minWidth: number; maxWidth: number } {
	const table = node.table!;
	const result = { minWidth: 0, maxWidth: 0 };
	for (let index = 0; index < span; index++) {
		result.minWidth +=
			table.widths[column + index]._minWidth + (index ? offsets.offsets[column + index] : 0);
		result.maxWidth +=
			table.widths[column + index]._maxWidth + (index ? offsets.offsets[column + index] : 0);
	}
	return result;
}

export function markColumnSpans(row: MeasuredPdfNode[], column: number, span: number): void {
	for (let index = 1; index < span; index++) {
		row[column + index] = {
			_span: true,
			_minWidth: 0,
			_maxWidth: 0,
			rowSpan: row[column].rowSpan,
		};
	}
}

export function markRowSpans(
	table: PdfTable<MeasuredPdfNode>,
	row: number,
	column: number,
	span: number,
): void {
	for (let index = 1; index < span; index++) {
		table.body[row + index][column] = {
			_span: true,
			_minWidth: 0,
			_maxWidth: 0,
			fillColor: table.body[row][column].fillColor,
			fillOpacity: table.body[row][column].fillOpacity,
		};
	}
}

export function extendTableWidths(node: MeasuredPdfNode): void {
	const table = node.table!;
	const rawWidths = table.widths ?? "auto";
	const widths = Array.isArray(rawWidths) ? [...rawWidths] : [rawWidths];
	while (widths.length < table.body[0].length) {
		widths.push(widths[widths.length - 1]);
	}
	table.widths = widths.map((width: RawColumnWidth): ColumnWidth => {
		if (isNumber(width) || isString(width)) {
			return { width, _minWidth: 0, _maxWidth: 0 };
		}
		return width;
	});
}
