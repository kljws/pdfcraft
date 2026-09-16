import type { LayoutPdfNode, PageSize, PreprocessedPdfNode } from "../../types/internal";

export type BackgroundGetter =
	| ((pageNumber: number, pageSize: PageSize) => unknown)
	| ((pageNumber: number, pageCount: number, pageSize: PageSize) => unknown);

export interface BackgroundLayoutContext {
	pageNumber: number;
	pageCount: number;
	pageSize: PageSize;
	beginUnbreakableBlock(width: number, height: number): void;
	commitUnbreakableBlock(forcedX: number, forcedY: number): void;
	preprocessNode(node: unknown): PreprocessedPdfNode;
	measureNode(node: PreprocessedPdfNode): LayoutPdfNode;
	layoutNode(node: LayoutPdfNode): void;
	recordBackgroundItems(count: number): void;
}
