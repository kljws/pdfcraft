import type { PageOrientation } from "../types";
import type { PageMargins, PageMarginSource, PdfPage } from "../types/internal";
import type DocumentContext from "./document-context";

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
	/** Set on the snapshot of a further flow region, pushed when the content enters it. */
	overflowed?: boolean | undefined;
	/** Regions of the flow opened with this column group, if any. */
	flow?: FlowRegions | undefined;
};

/** Horizontal extent of one region of a flow. */
export type FlowRegion = {
	x: number;
	width: number;
};

/**
 * Regions of a container flow, such as snaking columns. The container that opens the flow decides
 * where each region lies; the document context keeps the cursor and the snapshots of the regions in
 * use. Regions of a page are numbered from 0.
 */
export type FlowRegions = {
	/** Whether the region after `regionIndex` exists and fits on the current page. */
	hasNextRegion(context: DocumentContext, regionIndex: number): boolean;
	/** Region after `regionIndex`, entered from the current cursor. */
	nextRegion(context: DocumentContext, regionIndex: number): FlowRegion;
	/** First region of a new page. */
	firstRegion(context: DocumentContext): FlowRegion;
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

/** Cursor coordinates captured by `captureCoordinates` and restored by `restoreCoordinates`. */
export type CoordinateSnapshot = ContextCoordinates & {
	lastColumnWidth?: number | undefined;
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
