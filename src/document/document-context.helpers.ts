import type { Metadata, PageMargins, PageSize, PdfPage } from "../types/internal";
import type { ContextSnapshot, PagePosition } from "./document-context.types";

export function findSnakingSnapshot(snapshots: ContextSnapshot[]): ContextSnapshot | null {
	for (let index = snapshots.length - 1; index >= 0; index--) {
		if (snapshots[index].snakingColumns) {
			return snapshots[index];
		}
	}
	return null;
}

export function hasNestedNonSnakingGroup(snapshots: ContextSnapshot[]): boolean {
	for (let index = snapshots.length - 1; index >= 0; index--) {
		const snapshot = snapshots[index];
		if (snapshot.snakingColumns) {
			return false;
		}
		if (!snapshot.overflowed) {
			return true;
		}
	}
	return false;
}

export function createPage(
	pageSize: PageSize,
	pageMargins: PageMargins,
	customProperties: Metadata,
): PdfPage {
	return {
		items: [],
		pageSize,
		pageMargins,
		customProperties,
	};
}

export function getPagePosition(
	page: PdfPage,
	pageIndex: number,
	pageMargins: PageMargins,
	x: number,
	y: number,
): PagePosition {
	const { pageSize } = page;
	const innerHeight = pageSize.height - pageMargins.top - pageMargins.bottom;
	const innerWidth = pageSize.width - pageMargins.left - pageMargins.right;
	const ratio = (offset: number, size: number): number =>
		Number.isFinite(size) && size !== 0 ? offset / size : 0;
	return {
		pageNumber: pageIndex + 1,
		pageOrientation: pageSize.orientation,
		pageInnerHeight: innerHeight,
		pageInnerWidth: innerWidth,
		left: x,
		top: y,
		verticalRatio: ratio(y - pageMargins.top, innerHeight),
		horizontalRatio: ratio(x - pageMargins.left, innerWidth),
	};
}
