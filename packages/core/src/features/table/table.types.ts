import type {
	ColumnWidth,
	ContextSnapshot,
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
	_columnEndingContext?: ContextSnapshot | undefined;
	_endingCell?: EndingCell | undefined;
	_leftEndingCell?: EndingCell | undefined;
	_startingRowSpanY?: number | undefined;
	_startingRowSpanPage?: number | undefined;
	_rowTopPageY?: number | undefined;
	_breaksBySpan?: PageBreak[] | undefined;
	_willBreak?: boolean | undefined;
	_isUnbreakableContext?: boolean | undefined;
	_bottomByPage?: Record<number, number> | undefined;
	// Vertical-alignment inputs recorded on the aligned cell box.
	viewHeight?: number | undefined;
	bottomY?: number | undefined;
	_rowTopPageYPadding?: number | undefined;
	_lastPageNumber?: number | undefined;
	_rowSpanCurrentOffset?: number | undefined;
}

export type EndingCell = LayoutTableCell & {
	_endContext?: ContextSnapshot | undefined;
	_endingContext?: ContextSnapshot | undefined;
};

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
