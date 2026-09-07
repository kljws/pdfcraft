import type { PageOrientation } from "../types";
import type { Metadata, PageMargins, PageMarginSource, PageSize, PdfPage } from "../types/internal";

export interface ContextCoordinates {
	x: number;
	y: number;
	availableWidth: number;
	availableHeight: number;
	page: number;
}

export interface ContextSnapshot extends ContextCoordinates {
	bottomByPage: Record<number, number>;
	bottomMost: ContextCoordinates;
	lastColumnWidth: number;
	overflowed?: boolean;
	snakingColumns?: boolean;
	gap?: number;
	columnWidths?: number[] | null;
}

export interface DocumentContextState extends ContextCoordinates {
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
}

export interface ColumnEndingContext extends ContextCoordinates {
	lastColumnWidth?: number;
}

export interface ColumnEndingCell {
	_columnEndingContext?: ColumnEndingContext;
}

export interface PagePosition {
	pageNumber: number;
	pageOrientation: PageOrientation;
	pageInnerHeight: number;
	pageInnerWidth: number;
	left: number;
	top: number;
	verticalRatio: number;
	horizontalRatio: number;
}

export interface CreatePageOptions {
	pageSize: PageSize;
	pageMargins: PageMargins;
	customProperties: Metadata;
}

export interface DocumentContextEvents {
	pageAdded: [page: PdfPage];
}
