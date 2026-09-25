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
export interface TableNodeState<Node> {
	_tableAlignment?: "left" | "center" | "right";
	_headerLayout?: TableLayout<Node>;
	_bodyLayout?: TableLayout<Node>;
	_span?: boolean;
	_colSpan?: number;
	_bottomY?: number;
	_originalXOffset?: number;
	_columnEndingContext?: ContextSnapshot;
	_endingCell?: EndingCell;
	_leftEndingCell?: EndingCell;
	_startingRowSpanY?: number;
	_startingRowSpanPage?: number;
	_rowTopPageY?: number;
	_breaksBySpan?: PageBreak[];
	_willBreak?: boolean;
	_isUnbreakableContext?: boolean;
	_bottomByPage?: Record<number, number>;
	// Vertical-alignment inputs recorded on the aligned cell box.
	viewHeight?: number;
	bottomY?: number;
	_rowTopPageYPadding?: number;
	_lastPageNumber?: number;
	_rowSpanCurrentOffset?: number;
}

export type EndingCell = LayoutTableCell & {
	_endContext?: ContextSnapshot;
	_endingContext?: ContextSnapshot;
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

export interface TableMetrics<Node> {
	offsets: TableOffsets;
	layout: TableLayout<Node>;
}

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
