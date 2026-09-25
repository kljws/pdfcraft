import type {
	CurrentPosition,
	FeaturePageItem,
	LayoutPdfNode,
	PageItem,
	PdfPage,
} from "../types/internal";
import { getPageItemBottom } from "./page-item-geometry";

interface FeatureItemLayoutWriter {
	addFeatureItem(
		featureKind: FeaturePageItem["type"],
		node: LayoutPdfNode,
	): CurrentPosition | false | Array<CurrentPosition | undefined>;
}

export function layoutFeatureItem(
	featureKind: FeaturePageItem["type"],
	node: LayoutPdfNode,
	writer: FeatureItemLayoutWriter,
): void {
	const position = writer.addFeatureItem(featureKind, node);
	if (position && !Array.isArray(position)) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}

export function canPlaceOnCurrentPage(
	node: LayoutPdfNode,
	height: number,
	page: PdfPage | undefined,
	availableHeight: number,
): page is PdfPage {
	if (!page) return false;
	return !(
		node.absolutePosition === undefined &&
		availableHeight < height &&
		page.items.length > 0
	);
}

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
