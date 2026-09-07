import type { Color } from "../types";
import type { LayoutPdfNode, PageMargins, PageSize, PdfPage, Position } from "../types/internal";

export interface LayoutResult {
	pages: PdfPage[];
	linearNodeList: LayoutPdfNode[];
	pageMarginFunctionUsed?: boolean;
	dynamicBackgroundUsesPageCount?: boolean;
}

export interface PageBreakNodeInfo extends Record<string, unknown> {
	startPosition: Position;
	pageNumbers: number[];
	pages: number;
	stack: boolean;
}

export interface PageBreakHelpers {
	getFollowingNodesOnPage(): PageBreakNodeInfo[];
	getNodesOnNextPage(): PageBreakNodeInfo[];
	getPreviousNodesOnPage(): PageBreakNodeInfo[];
}

export type PageBreakBefore = (
	currentNode: PageBreakNodeInfo,
	helpers: PageBreakHelpers,
) => boolean;

export interface RepeatableSize {
	x: number;
	y: number;
	width: number;
	height: number;
}

export type RepeatableSizeFunction = (
	pageSize: PageSize,
	pageMargins: PageMargins,
) => RepeatableSize;

export type DynamicNodeGetter = (
	pageNumber: number,
	pageCount: number,
	pageSize: PageSize,
) => unknown;

export type BackgroundGetter =
	| ((pageNumber: number, pageSize: PageSize) => unknown)
	| ((pageNumber: number, pageCount: number, pageSize: PageSize) => unknown);

export interface WatermarkDefinition {
	text: string;
	font?: string;
	fontSize?: number | "auto";
	color?: Color;
	opacity?: number;
	bold?: boolean;
	italics?: boolean;
	angle?: number | null;
}

export interface WatermarkSize {
	size: { width: number; height: number };
	rotatedSize: { width: number; height: number };
}

export interface NormalizedWatermark extends WatermarkDefinition {
	font: string;
	fontSize: number;
	color: Color;
	opacity: number;
	bold: boolean;
	italics: boolean;
	angle: number;
}

export interface MeasuredWatermark {
	text: string;
	fontSize: number;
	color: Color;
	opacity: number;
	bold: boolean;
	italics: boolean;
	angle: number;
	font: unknown;
	_size: WatermarkSize;
}
