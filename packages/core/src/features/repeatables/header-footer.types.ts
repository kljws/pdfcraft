import type {
	LayoutPdfNode,
	PageMargins,
	PageSize,
	PdfPage,
	PreprocessedPdfNode,
} from "../../types/internal";

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

export interface HeaderFooterLayoutContext {
	pages: PdfPage[];
	setCurrentPage(pageIndex: number): void;
	beginUnbreakableBlock(width: number, height: number): void;
	commitUnbreakableBlock(
		forcedX: number,
		forcedY: number,
		detachedOverflowMessage?: string,
	): number | undefined;
	preprocessNode(node: unknown): PreprocessedPdfNode;
	measureNode(node: PreprocessedPdfNode): LayoutPdfNode;
	layoutNode(node: LayoutPdfNode): void;
}
