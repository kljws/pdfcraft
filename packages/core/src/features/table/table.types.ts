import type {
	ColumnWidth,
	LayoutPdfNode,
	LayoutNodeBase,
	MeasuredPdfNode,
	MeasuredNodeBase,
	PdfTable,
	PreprocessedPdfNode,
	PreprocessedNodeBase,
	RawTableWidths,
	TableLayout,
	TableOffsets,
} from "../../types/internal";

export type PreprocessedTableNode = PreprocessedNodeBase & {
	_kind: "table";
	table: PdfTable<PreprocessedPdfNode, RawTableWidths>;
};

export type TableMeasureNode = MeasuredNodeBase & {
	_kind: "table";
	table: PdfTable<MeasuredPdfNode, ColumnWidth[]>;
};

export interface TableMetrics<Node> {
	offsets: TableOffsets;
	layout: TableLayout<Node>;
}

export type MeasuredTableNode = TableMeasureNode & {
	metrics: TableMetrics<MeasuredPdfNode>;
};

export type LayoutTableNode = LayoutNodeBase & {
	_kind: "table";
	table: PdfTable<LayoutPdfNode, ColumnWidth[]>;
	metrics: TableMetrics<LayoutPdfNode>;
};
