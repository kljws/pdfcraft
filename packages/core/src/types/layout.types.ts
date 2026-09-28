import type { ColumnWidth } from "./table.types";
import type { Metadata } from "./document.types";

export type Point = {
	x: number;
	y: number;
};

export type Dimensions = {
	width: number;
	height: number;
};

export type PageSize = Dimensions & {
	orientation: "portrait" | "landscape";
};

export type PageMargins = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

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

export type Position = {
	pageNumber?: number | undefined;
};

export type CurrentPosition = {
	pageNumber: number;
	left: number;
	top: number;
	verticalRatio: number;
	horizontalRatio: number;
	pageOrientation: "portrait" | "landscape";
	pageInnerHeight: number;
	pageInnerWidth: number;
};

export type ContextSnapshot = {
	x: number;
	y: number;
	availableWidth: number;
	availableHeight: number;
	page: number;
	bottomByPage?: Metadata | undefined;
	bottomMost?: Metadata | undefined;
	snakingColumns?: boolean | undefined;
	columnGap?: number | undefined;
	columnWidths?: ColumnWidth[] | null | undefined;
	lastColumnWidth?: number | undefined;
};

export type PageBreak = {
	prevPage: number;
	prevY: number;
	y: number;
	rowIndex?: number | undefined;
	rowSpan?: number | undefined;
	rowIndexOfSpanEnd?: number | undefined;
};

export type NodeLayoutInfo = Metadata & {
	startPosition: Position;
	pageNumbers: number[];
	pages: number;
	stack: boolean;
};

export type OutlineDefinition = {
	id?: string | undefined;
	parentId?: string | undefined;
	text: string;
	expanded?: boolean | undefined;
};
