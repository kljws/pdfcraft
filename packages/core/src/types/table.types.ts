import type { PdfNode } from "./document.types";

export type ColumnNode<Node = PdfNode> = Node & ColumnWidth;

/** Width definition and measured widths of one column of a row, distributed by the width calculator. */
export type ColumnWidth = {
	width?: number | string | null | undefined;
	_minWidth: number;
	_maxWidth: number;
	_calcWidth?: number | undefined;
	elasticWidth?: boolean | undefined;
};
