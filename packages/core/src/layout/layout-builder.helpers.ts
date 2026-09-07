import type { PagePosition } from "../document/document-context.types";
import type { Inline, PdfPage } from "../types/internal";

export function addAll<T>(target: T[], values: readonly T[]): void {
	target.push(...values);
}

export function cloneInline(inline: Inline): Inline {
	return Object.assign(Object.create(Object.getPrototypeOf(inline)) as Inline, inline);
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

export function findMaxFitLength(
	text: string,
	maxWidth: number,
	measure: (text: string) => number,
): number {
	let low = 1;
	let high = text.length;
	let bestFit = 1;

	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const width = measure(text.substring(0, middle));
		if (width <= maxWidth) {
			bestFit = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}

	return bestFit;
}
