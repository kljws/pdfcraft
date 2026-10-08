import type { CoordinateSnapshot } from "../../document/document-context.types";
import type {
	ColumnWidth,
	PageBreak,
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

/**
 * State the table feature attaches to the table node and to each of its cells, whatever the
 * cell's own kind. It covers span bookkeeping, row placement and cross-page cell tracking.
 */
// Kept as an interface: it takes part in the recursive node types and breaks the cycle.
export interface TableNodeState<Node> {
	_tableAlignment?: "left" | "center" | "right" | undefined;
	_headerLayout?: TableLayout<Node> | undefined;
	_bodyLayout?: TableLayout<Node> | undefined;
	_span?: boolean | undefined;
	_colSpan?: number | undefined;
	_bottomY?: number | undefined;
	_originalXOffset?: number | undefined;
	/** Coordinates reached at the end of a row-spanned cell, restored when the span ends. */
	_columnEndingContext?: CoordinateSnapshot | undefined;
	_endingCell?: EndingCell | undefined;
	_leftEndingCell?: EndingCell | undefined;
	_startingRowSpanY?: number | undefined;
	_startingRowSpanPage?: number | undefined;
	_rowTopPageY?: number | undefined;
	_breaksBySpan?: TablePageBreak[] | undefined;
	_willBreak?: boolean | undefined;
	_isUnbreakableContext?: boolean | undefined;
	_bottomByPage?: Record<number, number> | undefined;
	_rowTopPageYPadding?: number | undefined;
	_lastPageNumber?: number | undefined;
	_rowSpanCurrentOffset?: number | undefined;
}

/** Page break observed while laying out a table row, with the row-span data tables track. */
export type TablePageBreak = PageBreak & {
	rowIndex?: number | undefined;
	rowSpan?: number | undefined;
	rowIndexOfSpanEnd?: number | undefined;
};

/** Last cell of a row span, which stores the coordinates reached by the spanning cell. */
export type EndingCell = LayoutTableCell;

export type MeasuredTableCell = MeasuredPdfNode & TableNodeState<MeasuredPdfNode>;
export type LayoutTableCell = LayoutPdfNode & TableNodeState<LayoutPdfNode>;

export type PreprocessedTableNode = PreprocessedNodeBase & {
	_kind: "table";
	table: PdfTable<PreprocessedPdfNode, RawTableWidths>;
};

export type TableMeasureNode = MeasuredNodeBase &
	TableNodeState<MeasuredPdfNode> & {
		_kind: "table";
		table: PdfTable<MeasuredTableCell, ColumnWidth[]>;
	};

export type TableMetrics<Node> = {
	offsets: TableOffsets;
	layout: TableLayout<Node>;
};

export type MeasuredTableNode = TableMeasureNode & {
	metrics: TableMetrics<MeasuredPdfNode>;
};

export type LayoutTableNode = LayoutNodeBase &
	TableNodeState<LayoutPdfNode> & {
		_kind: "table";
		table: PdfTable<LayoutTableCell, ColumnWidth[]>;
		metrics: TableMetrics<LayoutPdfNode>;
	};

declare module "../../types/document.types" {
	interface NodeKindRegistry {
		table: {
			preprocessed: PreprocessedTableNode;
			measure: TableMeasureNode;
			measured: MeasuredTableNode;
			layout: LayoutTableNode;
		};
	}
}
