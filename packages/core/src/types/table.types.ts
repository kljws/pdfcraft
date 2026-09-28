import type { PdfNode } from "./document.types";
import type { TableRowGroupLayout } from "./content.types";

export type ColumnNode<Node = PdfNode> = Node & ColumnWidth;

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
	keepWithHeaderRows?: number | undefined;
	dontBreakRows?: boolean | undefined;
	_rowGroups?: TableRowGroupRange<Node>[] | undefined;
	_headerLayout?: string | Partial<TableLayout<Node>> | undefined;
	_bodyLayout?: string | Partial<TableLayout<Node>> | undefined;
	_blockContainer?: boolean | undefined;
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

export type ColumnWidth = {
	width?: number | string | null | undefined;
	_minWidth: number;
	_maxWidth: number;
	_calcWidth?: number | undefined;
	elasticWidth?: boolean | undefined;
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
