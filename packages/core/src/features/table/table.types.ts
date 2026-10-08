import type { CoordinateSnapshot } from "../../document/document-context.types";
import type { TableRowGroupLayout } from "../../types";
import type {
	ColumnWidth,
	LayoutNodeBase,
	LayoutPdfNode,
	MeasuredNodeBase,
	MeasuredPdfNode,
	Metadata,
	PageBreak,
	PdfNode,
	PreprocessedNodeBase,
	PreprocessedPdfNode,
} from "../../types/internal";

export type RawColumnWidth = ColumnWidth | number | string;
export type RawTableWidths = RawColumnWidth | RawColumnWidth[];

export type PdfTable<Node = PdfNode, Widths = ColumnWidth[]> = {
	body: Node[][];
	widths: Widths;
	borderRadius?: number | undefined;
	heights?:
		| number
		| "auto"
		| Array<number | "auto">
		| ((rowIndex: number) => number | "auto")
		| undefined;
	headerRows?: number | undefined;
	/**
	 * Keeps every row whole, the first one with the top border. Never read from the public shape:
	 * only `normalizeTable` sets it, for tables that other features build (the table of contents).
	 */
	dontBreakRows?: boolean | undefined;
	_rowGroups?: TableRowGroupRange<Node>[] | undefined;
	_headerLayout?: string | Partial<TableLayout<Node>> | undefined;
	_bodyLayout?: string | Partial<TableLayout<Node>> | undefined;
};

export type TableRowGroupRange<Node = PdfNode> = {
	groupIndex: number;
	startRow: number;
	endRow: number;
	keepTogether: boolean;
	dontBreakRows: boolean;
	layoutDefinition?: TableRowGroupLayout | undefined;
	layout?: TableLayout<Node> | undefined;
};

export type TableOffsets = {
	total: number;
	offsets: number[];
};

export type TableLayout<Node = PdfNode> = {
	hLineWhenBroken?: boolean | undefined;
	hLineWidth(index: number, node: Node): number;
	vLineWidth(index: number, node: Node): number;
	hLineColor(index: number, node: Node, columnIndex?: number): unknown;
	vLineColor(index: number, node: Node, rowIndex?: number): unknown;
	paddingLeft(index: number, node: Node): number;
	paddingRight(index: number, node: Node): number;
	paddingTop(index: number, node: Node): number;
	paddingBottom(index: number, node: Node): number;
	defaultBorder: boolean;
	hLineStyle?(index: number, node: Node): { dash?: unknown } | null | undefined;
	vLineStyle?(index: number, node: Node): { dash?: unknown } | null | undefined;
	fillColor?: unknown;
	fillOpacity?: unknown;
};

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
	interface NodeHierarchy<Node> {
		/** Table definition; its shape is owned by the table feature. */
		table?: Metadata | undefined;
	}

	interface PdfNode {
		colSpan?: number | undefined;
		rowSpan?: number | undefined;
		border?: [boolean, boolean, boolean, boolean] | undefined;
		overlayPattern?: PDFKit.Mixins.ColorValue | undefined;
		overlayOpacity?: number | undefined;
		tableAlignment?: "left" | "center" | "right" | undefined;
	}

	interface NodeKindRegistry {
		table: {
			preprocessed: PreprocessedTableNode;
			measure: TableMeasureNode;
			measured: MeasuredTableNode;
			layout: LayoutTableNode;
		};
	}
}
