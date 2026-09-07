import type { LayoutPdfNode, PageBreak } from "../types/internal";

export type TablePageBreak = PageBreak;

export function findStartingRowSpanCell(
	cells: LayoutPdfNode[],
	columnIndex: number,
): LayoutPdfNode | null {
	let requiredColspan = 1;
	for (let index = columnIndex - 1; index >= 0; index--) {
		if (!cells[index]?._span) {
			return (cells[index]?.rowSpan ?? 0) > 1 && (cells[index]?.colSpan || 1) === requiredColspan
				? cells[index]
				: null;
		}
		requiredColspan++;
	}
	return null;
}

export function getPageBreak(
	pageBreaks: TablePageBreak[],
	page: number,
): TablePageBreak | undefined {
	return pageBreaks.find((description) => description.prevPage === page);
}

export function getPageBreakListBySpan(
	tableNode: LayoutPdfNode | undefined,
	page: number,
	rowIndex: number,
): TablePageBreak | null {
	if (!tableNode?._breaksBySpan) return null;

	const breaks = tableNode._breaksBySpan.filter(
		(description: TablePageBreak) =>
			description.prevPage === page &&
			typeof description.rowIndexOfSpanEnd === "number" &&
			rowIndex <= description.rowIndexOfSpanEnd,
	);
	let y = Number.MAX_VALUE;
	let prevY = Number.MIN_VALUE;
	for (const pageBreak of breaks) {
		prevY = Math.max(pageBreak.prevY, prevY);
		y = Math.min(pageBreak.y, y);
	}
	return { prevPage: page, prevY, y };
}

export function findSameRowPageBreakByRowSpanData(
	breaksBySpan: TablePageBreak[] | undefined,
	page: number,
	rowIndex: number,
): TablePageBreak | undefined | null {
	return breaksBySpan?.find(
		(description) => description.prevPage === page && rowIndex === description.rowIndexOfSpanEnd,
	);
}

export function resolveBreakY(
	first: TablePageBreak,
	second: TablePageBreak,
	target: TablePageBreak,
): void {
	target.prevY = Math.max(first.prevY, second.prevY);
	target.y = Math.min(first.y, second.y);
}

export function updatePageBreaksData(
	pageBreaks: TablePageBreak[],
	tableNode: LayoutPdfNode,
	rowIndex: number,
): void {
	const bottomByPage = tableNode._bottomByPage ?? {};
	for (const pageKey of Object.keys(bottomByPage)) {
		const page = Number(pageKey);
		const pageBreak = getPageBreak(pageBreaks, page);
		if (pageBreak) {
			pageBreak.prevY = Math.max(pageBreak.prevY, bottomByPage[page]);
		}

		const spanBreaks = tableNode._breaksBySpan?.filter(
			(candidate: TablePageBreak) =>
				candidate.prevPage === page &&
				typeof candidate.rowIndexOfSpanEnd === "number" &&
				rowIndex <= candidate.rowIndexOfSpanEnd,
		);
		for (const spanBreak of spanBreaks ?? []) {
			spanBreak.prevY = Math.max(spanBreak.prevY, bottomByPage[page]);
		}
	}
}

export function storePageBreakData(
	data: TablePageBreak,
	startsRowSpan: boolean,
	pageBreaks: TablePageBreak[],
	tableNode: LayoutPdfNode | undefined,
): void {
	const rowIndex = data.rowIndex;
	if (rowIndex === undefined) {
		throw new Error("Internal layout error: table page break has no row index");
	}
	if (!startsRowSpan) {
		let pageBreak = getPageBreak(pageBreaks, data.prevPage);
		const spanBreak = getPageBreakListBySpan(tableNode, data.prevPage, rowIndex);
		if (!pageBreak) {
			pageBreak = { ...data };
			pageBreaks.push(pageBreak);
		}
		if (spanBreak) resolveBreakY(pageBreak, spanBreak, pageBreak);
		resolveBreakY(pageBreak, data, pageBreak);
		return;
	}
	if (!tableNode) return;
	const rowSpan = data.rowSpan;
	if (rowSpan === undefined) {
		throw new Error("Internal layout error: row-span page break has no span length");
	}

	const breaksBySpan = tableNode._breaksBySpan as TablePageBreak[] | undefined;
	let spanBreak = findSameRowPageBreakByRowSpanData(breaksBySpan, data.prevPage, rowIndex);
	if (!spanBreak) {
		spanBreak = {
			...data,
			rowIndexOfSpanEnd: rowIndex + rowSpan - 1,
		};
		tableNode._breaksBySpan ??= [];
		tableNode._breaksBySpan.push(spanBreak);
	}
	spanBreak.prevY = Math.max(spanBreak.prevY, data.prevY);
	spanBreak.y = Math.min(spanBreak.y, data.y);
	const pageBreak = getPageBreak(pageBreaks, data.prevPage);
	if (pageBreak) resolveBreakY(pageBreak, spanBreak, pageBreak);
}

export function columnLeftOffset(columnIndex: number, gaps?: readonly number[] | null): number {
	return gaps?.[columnIndex] ?? 0;
}

export function getRowSpanEndingCell(
	tableBody: LayoutPdfNode[][],
	rowIndex: number,
	column: LayoutPdfNode,
	columnIndex: number,
): LayoutPdfNode | null {
	if (!column.rowSpan || column.rowSpan <= 1) return null;

	const endingRow = rowIndex + column.rowSpan - 1;
	if (endingRow >= tableBody.length) {
		throw new Error(
			`Row span for column ${columnIndex} (with indexes starting from 0) exceeded row count`,
		);
	}
	return tableBody[endingRow][columnIndex];
}
