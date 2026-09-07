import type { PageOrientation } from "../types";
import type { PageSize, PdfPage } from "../types/internal";
import type { ContextCoordinates } from "./document-context.types";

export function resolvePageOrientation(
	orientation: unknown,
	currentOrientation: PageOrientation,
): PageOrientation {
	if (orientation === undefined) {
		return currentOrientation;
	}
	return typeof orientation === "string" && orientation.toLowerCase() === "landscape"
		? "landscape"
		: "portrait";
}

export function getPageSize(currentPage: PdfPage, orientation: unknown): PageSize {
	const nextOrientation = resolvePageOrientation(orientation, currentPage.pageSize.orientation);
	if (nextOrientation !== currentPage.pageSize.orientation) {
		return {
			orientation: nextOrientation,
			width: currentPage.pageSize.height,
			height: currentPage.pageSize.width,
		};
	}
	return { ...currentPage.pageSize };
}

export function bottomMostContext(
	first: ContextCoordinates,
	second: ContextCoordinates,
): ContextCoordinates {
	const result =
		first.page > second.page
			? first
			: second.page > first.page
				? second
				: first.y > second.y
					? first
					: second;

	return {
		page: result.page,
		x: result.x,
		y: result.y,
		availableHeight: result.availableHeight,
		availableWidth: result.availableWidth,
	};
}
