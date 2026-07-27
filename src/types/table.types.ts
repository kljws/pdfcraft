import type { PdfNode } from "./document.types";

export type ColumnNode<Node = PdfNode> = Node & ColumnWidth;

export type RawColumnWidth = ColumnWidth | number | string;
export type RawTableWidths = RawColumnWidth | RawColumnWidth[];

export interface PdfTable<Node = PdfNode, Widths = ColumnWidth[]> {
	body: Node[][];
	widths: Widths;
	borderRadius?: number;
	heights?: number | "auto" | Array<number | "auto"> | ((rowIndex: number) => number | "auto");
	headerRows?: number;
	keepWithHeaderRows?: number;
	dontBreakRows?: boolean;
	_rowGroups?: TableRowGroupRange[];
	_headerLayout?: string | Partial<TableLayout<Node>>;
	_bodyLayout?: string | Partial<TableLayout<Node>>;
	_blockContainer?: boolean;
}

export interface TableRowGroupRange {
	startRow: number;
	endRow: number;
	keepTogether: boolean;
	dontBreakRows: boolean;
}

export interface ColumnWidth {
	width?: number | string | null;
	_minWidth: number;
	_maxWidth: number;
	_calcWidth?: number;
	elasticWidth?: boolean;
}

export interface TableOffsets {
	total: number;
	offsets: number[];
}

export interface TableLayout<Node = PdfNode> {
	hLineWhenBroken?: boolean;
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
}
