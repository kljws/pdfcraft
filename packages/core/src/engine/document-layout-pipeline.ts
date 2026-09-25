import type { LayoutPdfNode, PageMargins, PdfPage } from "../types/internal";

const MAX_LAYOUT_PASSES = 10;

export interface DocumentLayoutPassResult {
	pages: PdfPage[];
	linearNodeList: LayoutPdfNode[];
	pageMarginFunctionUsed?: boolean;
	dynamicBackgroundUsesPageCount?: boolean;
	basePageMargins: PageMargins[];
	footerHeights: Array<number | undefined>;
}

export interface DocumentLayoutPipelineContext {
	runPass(pageCount: number, bottomMarginOverrides: readonly number[]): DocumentLayoutPassResult;
	requiresPageBreakRelayout(result: DocumentLayoutPassResult): boolean;
}

const getFooterBottomMargins = (result: DocumentLayoutPassResult): number[] => {
	const needsExpandedMargin = result.footerHeights.some(
		(height, pageIndex) =>
			height !== undefined && height > result.basePageMargins[pageIndex].bottom,
	);
	if (!needsExpandedMargin) return [];
	return result.basePageMargins.map((margins, pageIndex) =>
		Math.max(margins.bottom, result.footerHeights[pageIndex] ?? 0),
	);
};

const equalMargins = (current: readonly number[], next: readonly number[]): boolean =>
	current.length === next.length &&
	current.every((margin, pageIndex) => Math.abs(margin - next[pageIndex]) < 0.001);

export function runDocumentLayoutPipeline(context: DocumentLayoutPipelineContext): PdfPage[] {
	let assumedPageCount = 0;
	let bottomMarginOverrides: number[] = [];
	let layoutPass = 1;
	const pageCountHistory = [assumedPageCount];
	let warnedAboutCycle = false;
	let result = context.runPass(assumedPageCount, bottomMarginOverrides);

	while (layoutPass < MAX_LAYOUT_PASSES) {
		const nextPageCount = result.pages.length;
		const nextBottomMarginOverrides = getFooterBottomMargins(result);
		const footerMarginsNeedAnotherPass = !equalMargins(
			bottomMarginOverrides,
			nextBottomMarginOverrides,
		);
		const marginsNeedAnotherPass =
			Boolean(result.pageMarginFunctionUsed) && assumedPageCount !== nextPageCount;
		const backgroundNeedsAnotherPass =
			Boolean(result.dynamicBackgroundUsesPageCount) && assumedPageCount !== nextPageCount;
		const pageBreakNeedsAnotherPass = context.requiresPageBreakRelayout(result);

		if (
			!footerMarginsNeedAnotherPass &&
			!marginsNeedAnotherPass &&
			!backgroundNeedsAnotherPass &&
			!pageBreakNeedsAnotherPass
		) {
			break;
		}

		if (footerMarginsNeedAnotherPass || marginsNeedAnotherPass || backgroundNeedsAnotherPass) {
			if (
				(marginsNeedAnotherPass || backgroundNeedsAnotherPass) &&
				!warnedAboutCycle &&
				pageCountHistory.includes(nextPageCount)
			) {
				console.warn(
					"Non-convergent dynamic layout detected; layout stopped after a bounded number of passes.",
				);
				warnedAboutCycle = true;
			}
			assumedPageCount = nextPageCount;
			pageCountHistory.push(nextPageCount);
		}
		bottomMarginOverrides = nextBottomMarginOverrides;

		for (const node of result.linearNodeList) node.resetXY?.();
		result = context.runPass(assumedPageCount, bottomMarginOverrides);
		layoutPass++;
	}

	if (!equalMargins(bottomMarginOverrides, getFooterBottomMargins(result))) {
		throw new Error(`Footer height did not converge after ${MAX_LAYOUT_PASSES} layout passes`);
	}

	return result.pages;
}
