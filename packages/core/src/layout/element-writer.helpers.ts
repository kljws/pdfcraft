import { offsetVector } from "../utils/tools";
import type { LayoutPdfNode, PageItem, PdfPage, Vector } from "../types/internal";
import { getPageItemBottom } from "./page-item-geometry";

export function getAlignmentOffset(
	alignment: string | undefined,
	availableWidth: number,
	contentWidth: number,
): number {
	if (alignment === "right") {
		return availableWidth - contentWidth;
	}
	if (alignment === "center") {
		return (availableWidth - contentWidth) / 2;
	}
	return 0;
}

export function alignImage(image: LayoutPdfNode, availableWidth: number): void {
	const offset = getAlignmentOffset(image._alignment, availableWidth, image._minWidth ?? 0);
	if (offset) {
		image.x = (image.x || 0) + offset;
	}
}

export function alignCanvas(node: LayoutPdfNode, availableWidth: number): void {
	const offset = getAlignmentOffset(node._alignment, availableWidth, node._minWidth ?? 0);
	if (offset) {
		node.canvas?.forEach((vector: Vector) => offsetVector(vector, offset, 0));
	}
}

export function addPageItem(page: PdfPage, item: PageItem, index?: number): void {
	if (index === null || index === undefined || index < 0 || index > page.items.length) {
		page.items.push(item);
	} else {
		page.items.splice(index, 0, item);
	}
}

export function getFragmentHeight(items: PageItem[], cursorY: number): number {
	return Math.max(cursorY, ...items.map(getPageItemBottom));
}
