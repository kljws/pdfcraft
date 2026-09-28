import { describe, expect, it } from "vitest";
import {
	runDocumentLayoutPipeline,
	type DocumentLayoutPassResult,
} from "../document-layout-pipeline";
import type { LayoutPdfNode, PdfPage } from "../../types/internal";

const margins = { left: 40, right: 40, top: 40, bottom: 40 };

function passResult(
	pageCount: number,
	options: Partial<DocumentLayoutPassResult> = {},
): DocumentLayoutPassResult {
	return {
		pages: Array.from({ length: pageCount }, () => ({}) as PdfPage),
		linearNodeList: [],
		basePageMargins: Array.from({ length: pageCount }, () => margins),
		footerHeights: [],
		...options,
	};
}

describe("runDocumentLayoutPipeline", () => {
	it("returns after one pass when nothing depends on the layout", () => {
		let passes = 0;
		const pages = runDocumentLayoutPipeline({
			runPass: () => {
				passes++;
				return passResult(2);
			},
			requiresPageBreakRelayout: () => false,
		});
		expect(pages).toHaveLength(2);
		expect(passes).toBe(1);
	});

	it("reruns until a page-count-dependent margin function stabilizes", () => {
		const assumed: number[] = [];
		runDocumentLayoutPipeline({
			runPass: (pageCount) => {
				assumed.push(pageCount);
				return passResult(3, { pageMarginFunctionUsed: true });
			},
			requiresPageBreakRelayout: () => false,
		});
		expect(assumed).toEqual([0, 3]);
	});

	it("throws with the unresolved reason when the page count oscillates", () => {
		expect(() =>
			runDocumentLayoutPipeline({
				runPass: (pageCount) =>
					passResult(pageCount === 2 ? 3 : 2, { dynamicBackgroundUsesPageCount: true }),
				requiresPageBreakRelayout: () => false,
			}),
		).toThrow(/did not converge after 10 layout passes: background page count/);
	});

	it("throws when footer heights never stabilize", () => {
		let height = 50;
		expect(() =>
			runDocumentLayoutPipeline({
				runPass: () => passResult(1, { footerHeights: [height++] }),
				requiresPageBreakRelayout: () => false,
			}),
		).toThrow(/footer height/);
	});

	it("applies more page breaks than the dynamic pass budget", () => {
		const nodes = Array.from({ length: 30 }, () => ({}) as LayoutPdfNode);
		let breaks = 0;
		let passes = 0;
		runDocumentLayoutPipeline({
			runPass: () => {
				passes++;
				return passResult(1 + breaks, { linearNodeList: nodes });
			},
			requiresPageBreakRelayout: () => {
				if (breaks >= 25) return false;
				breaks++;
				return true;
			},
		});
		expect(breaks).toBe(25);
		expect(passes).toBe(26);
	});

	it("rejects a page-break callback reporting more breaks than nodes", () => {
		const nodes = [{} as LayoutPdfNode];
		expect(() =>
			runDocumentLayoutPipeline({
				runPass: () => passResult(1, { linearNodeList: nodes }),
				requiresPageBreakRelayout: () => true,
			}),
		).toThrow(/pageBreakBefore requested 2 breaks for 1 nodes/);
	});
});
