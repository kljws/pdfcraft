import { normalizePageMargin } from "../configuration/page-size";
import type { PagePosition } from "../document/document-context.types";
import type { PageItem, PageMargins, PdfPage, Vector } from "../types/internal";
import { getCanvasPathBounds } from "../utils/canvas-path-bounds";

export function getVectorBottom(vector: Vector): number {
	const strokeOffset = (vector.lineWidth ?? 0) / 2;
	switch (vector.type) {
		case "rect":
			return (vector.y ?? 0) + (vector.h ?? 0) + strokeOffset;
		case "ellipse":
			return (vector.y ?? 0) + (vector.r2 ?? vector.r ?? 0) + strokeOffset;
		case "line":
			return Math.max(vector.y1 ?? 0, vector.y2 ?? 0) + strokeOffset;
		case "polyline":
			return Math.max(0, ...(vector.points ?? []).map((point) => point.y)) + strokeOffset;
		case "path":
			return (vector.y ?? 0) + (getCanvasPathBounds(vector.d)?.maxY ?? 0) + strokeOffset;
	}
}

export function getPageItemBottom(item: PageItem): number {
	if (!item.item) return 0;
	switch (item.type) {
		case "vector":
			return getVectorBottom(item.item);
		case "line":
			return (item.item.y ?? 0) + item.item.getHeight();
		case "image":
		case "extension":
		case "attachment":
		case "acroform":
			return (item.item.y ?? 0) + (item.item._height ?? 0);
		case "beginClip":
			return (item.item.y ?? 0) + (item.item.height ?? 0);
		case "beginVerticalAlignment":
		case "endVerticalAlignment":
			return item.item.y ?? 0;
	}
}

export function calculatePageHeight(page: PdfPage, margins: PageMargins): number {
	const fixedMargins = normalizePageMargin(margins || 40);
	const height = Math.max(fixedMargins.top, ...page.items.map(getPageItemBottom));
	return height + fixedMargins.bottom;
}

export function getPageSpanHeight(
	start: PagePosition,
	end: PagePosition,
	pages: PdfPage[],
): number {
	const startPageIndex = start.pageNumber - 1;
	const endPageIndex = end.pageNumber - 1;
	if (startPageIndex === endPageIndex) return Math.max(0, end.top - start.top);
	if (startPageIndex < 0 || endPageIndex >= pages.length || endPageIndex < startPageIndex) return 0;

	const firstPage = pages[startPageIndex];
	let height = firstPage.pageSize.height - firstPage.pageMargins.bottom - start.top;
	for (let pageIndex = startPageIndex + 1; pageIndex < endPageIndex; pageIndex++) {
		const page = pages[pageIndex];
		height += page.pageSize.height - page.pageMargins.top - page.pageMargins.bottom;
	}
	const lastPage = pages[endPageIndex];
	height += end.top - lastPage.pageMargins.top;
	return Math.max(0, height);
}
