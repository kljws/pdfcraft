import { normalizePageMargin } from "../configuration/page-size";
import type { PageItem, PageMargins, PdfPage, Vector } from "../types/internal";

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
			return vector.y ?? 0;
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
		case "svg":
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
