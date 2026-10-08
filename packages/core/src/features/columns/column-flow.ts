import type DocumentContext from "../../document/document-context";
import type { FlowRegions } from "../../document/document-context.types";

/**
 * Flow of snaking columns: content fills the first column, continues at the top of each following
 * column of the row, and restarts in the first column on the next page. Region `n` is column `n`.
 */
export function createColumnFlow(gap: number, columnWidths: readonly number[]): FlowRegions {
	return {
		hasNextRegion(context: DocumentContext, regionIndex: number): boolean {
			if (regionIndex >= columnWidths.length - 1) return false;

			const currentColumnWidth = context.availableWidth || context.lastColumnWidth || 0;
			const nextColumnWidth = columnWidths[regionIndex + 1] ?? currentColumnWidth;
			const nextX = context.x + currentColumnWidth + gap;
			const page = context.requireCurrentPage();
			const rightMargin = page.pageMargins ? page.pageMargins.right : 0;
			const parentRightMargin = context.marginXTopParent ? context.marginXTopParent[1] : 0;
			const rightBoundary = page.pageSize.width - rightMargin - parentRightMargin;

			return nextX + nextColumnWidth <= rightBoundary + 1;
		},

		nextRegion(context: DocumentContext, regionIndex: number) {
			const currentColumnWidth =
				columnWidths[regionIndex] || context.lastColumnWidth || context.availableWidth;
			const nextColumnWidth = columnWidths[regionIndex + 1] || currentColumnWidth;
			return { x: context.x + currentColumnWidth + gap, width: nextColumnWidth };
		},

		firstRegion(context: DocumentContext) {
			const left = context.marginXTopParent
				? context.pageMargins.left + context.marginXTopParent[0]
				: context.pageMargins.left;
			const width = columnWidths[0] || context.lastColumnWidth || context.availableWidth;
			return { x: left, width };
		},
	};
}
