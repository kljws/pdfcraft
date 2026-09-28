import type { PageOrientation } from "../types";
import type { PageMargins, PageMarginSource, PdfPage } from "../types/internal";

export type ContextCoordinates = {
	x: number;
	y: number;
	availableWidth: number;
	availableHeight: number;
	page: number;
};

export type ContextSnapshot = ContextCoordinates & {
	bottomByPage: Record<number, number>;
	bottomMost: ContextCoordinates;
	lastColumnWidth: number;
	overflowed?: boolean | undefined;
	snakingColumns?: boolean | undefined;
	gap?: number | undefined;
	columnWidths?: number[] | null | undefined;
};

export type DocumentContextState = ContextCoordinates & {
	pages: PdfPage[];
	pageMargins: PageMargins;
	pageMarginSource: PageMarginSource;
	pageCount: number;
	pageMarginFunctionUsed: boolean;
	snapshots: ContextSnapshot[];
	backgroundLength: number[];
	lastColumnWidth: number;
	marginXTopParent: [number, number] | null;
	height: number;
};

export type ColumnEndingContext = ContextCoordinates & {
	lastColumnWidth?: number | undefined;
};

export type ColumnEndingCell = {
	_columnEndingContext?: ColumnEndingContext | undefined;
};

export type PagePosition = {
	pageNumber: number;
	pageOrientation: PageOrientation;
	pageInnerHeight: number;
	pageInnerWidth: number;
	left: number;
	top: number;
	verticalRatio: number;
	horizontalRatio: number;
};

export type DocumentContextEvents = {
	pageAdded: [page: PdfPage];
};
