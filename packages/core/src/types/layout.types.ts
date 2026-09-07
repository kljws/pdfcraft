import type { ColumnWidth } from "./table.types";
import type { LayoutPdfNode, Metadata } from "./document.types";

export interface Point {
	x: number;
	y: number;
}

export interface Dimensions {
	width: number;
	height: number;
}

export interface PageSize extends Dimensions {
	orientation: "portrait" | "landscape";
}

export interface PageMargins {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export type PageMarginDefinition =
	| number
	| [number, number]
	| [number, number, number, number]
	| PageMargins;

export type DynamicPageMargins = (
	currentPage: number,
	pageCount: number,
	pageSize: PageSize,
) => PageMarginDefinition;

export type PageMarginSource = PageMarginDefinition | DynamicPageMargins;

export interface Position {
	pageNumber?: number;
}

export interface CurrentPosition {
	pageNumber: number;
	left: number;
	top: number;
	verticalRatio: number;
	horizontalRatio: number;
	pageOrientation: "portrait" | "landscape";
	pageInnerHeight: number;
	pageInnerWidth: number;
}

export interface ContextSnapshot {
	x: number;
	y: number;
	availableWidth: number;
	availableHeight: number;
	page: number;
	bottomByPage?: Metadata;
	bottomMost?: Metadata;
	snakingColumns?: boolean;
	columnGap?: number;
	columnWidths?: ColumnWidth[] | null;
	lastColumnWidth?: number;
}

export type EndingCell = LayoutPdfNode & {
	_endContext?: ContextSnapshot;
	_endingContext?: ContextSnapshot;
};

export interface LayoutResult {
	positions: Position[];
	pageBreaks?: PageBreak[];
}

export interface PageBreak {
	prevPage: number;
	prevY: number;
	y: number;
	rowIndex?: number;
	rowSpan?: number;
	rowIndexOfSpanEnd?: number;
}

export interface NodeLayoutInfo extends Metadata {
	startPosition: Position;
	pageNumbers: number[];
	pages: number;
	stack: boolean;
}

export interface OutlineDefinition {
	id?: string;
	parentId?: string;
	text: string;
	expanded?: boolean;
}
