import type { LayoutPdfNode, PageMargins, PdfPage } from "../types/internal";

const maxLayoutPasses = 10;

export type DocumentLayoutPassResult = {
	pages: PdfPage[];
	linearNodeList: LayoutPdfNode[];
	pageMarginFunctionUsed?: boolean | undefined;
	dynamicBackgroundUsesPageCount?: boolean | undefined;
	basePageMargins: PageMargins[];
	footerHeights: Array<number | undefined>;
	/** A page number was measured with a value that differs from its target's final page. */
	pageReferencesChanged?: boolean | undefined;
};

export type DocumentLayoutPipelineContext = {
	runPass(pageCount: number, bottomMarginOverrides: readonly number[]): DocumentLayoutPassResult;
	requiresPageBreakRelayout(result: DocumentLayoutPassResult): boolean;
};

const getFooterBottomMargins = (result: DocumentLayoutPassResult): number[] => {
	const needsExpandedMargin = result.footerHeights.some((height, pageIndex) => {
		const base = result.basePageMargins[pageIndex];
		return height !== undefined && base !== undefined && height > base.bottom;
	});
	if (!needsExpandedMargin) return [];
	return result.basePageMargins.map((margins, pageIndex) =>
		Math.max(margins.bottom, result.footerHeights[pageIndex] ?? 0),
	);
};

const equalMargins = (current: readonly number[], next: readonly number[]): boolean =>
	current.length === next.length &&
	current.every((margin, pageIndex) => {
		const other = next[pageIndex];
		return other !== undefined && Math.abs(margin - other) < 0.001;
	});

/** Reasons a pass result depends on assumptions that the pass itself invalidated. */
function getUnstableReasons(
	result: DocumentLayoutPassResult,
	assumedPageCount: number,
	bottomMarginOverrides: readonly number[],
): string[] {
	const reasons: string[] = [];
	if (!equalMargins(bottomMarginOverrides, getFooterBottomMargins(result))) {
		reasons.push("footer height");
	}
	const pageCountChanged = assumedPageCount !== result.pages.length;
	if (result.pageMarginFunctionUsed && pageCountChanged) reasons.push("page margins function");
	if (result.dynamicBackgroundUsesPageCount && pageCountChanged)
		reasons.push("background page count");
	if (result.pageReferencesChanged) reasons.push("page references");
	return reasons;
}

/**
 * Repeats layout passes until the result is stable.
 *
 * Two kinds of progress have separate bounds:
 * - dynamic layout (footer heights, page-count-dependent margins and backgrounds) must stabilize
 *   within `maxLayoutPasses` consecutive passes, otherwise it is considered oscillating;
 * - each `pageBreakBefore` break is permanent progress, since a node is evaluated only once, so
 *   breaks are bounded by the number of laid-out nodes and restart the dynamic budget.
 *
 * Reaching either bound throws instead of returning an unstable layout.
 */
export function runDocumentLayoutPipeline(context: DocumentLayoutPipelineContext): PdfPage[] {
	let assumedPageCount = 0;
	let bottomMarginOverrides: number[] = [];
	let result = context.runPass(assumedPageCount, bottomMarginOverrides);
	let dynamicPasses = 1;
	let pageBreakPasses = 0;
	const laidOutNodes = new Set<LayoutPdfNode>();

	for (;;) {
		for (const node of result.linearNodeList) laidOutNodes.add(node);
		const unstableReasons = getUnstableReasons(result, assumedPageCount, bottomMarginOverrides);
		const pageBreakAdded = context.requiresPageBreakRelayout(result);

		if (unstableReasons.length === 0 && !pageBreakAdded) return result.pages;

		if (pageBreakAdded) {
			pageBreakPasses++;
			if (pageBreakPasses > laidOutNodes.size) {
				throw new Error(
					`Layout did not converge: pageBreakBefore requested ${pageBreakPasses} breaks for ${laidOutNodes.size} nodes`,
				);
			}
			dynamicPasses = 0;
		} else if (dynamicPasses >= maxLayoutPasses) {
			throw new Error(
				`Layout did not converge after ${maxLayoutPasses} layout passes: ${unstableReasons.join(", ")} still changed the layout`,
			);
		}

		if (unstableReasons.length > 0) {
			assumedPageCount = result.pages.length;
			bottomMarginOverrides = getFooterBottomMargins(result);
		}
		for (const node of result.linearNodeList) node.resetXY?.();
		result = context.runPass(assumedPageCount, bottomMarginOverrides);
		dynamicPasses++;
	}
}
