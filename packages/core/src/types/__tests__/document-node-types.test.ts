import { describe, expect, it } from "vitest";

import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode, RawPdfNode } from "../internal";

describe("document node lifecycle types", () => {
	it("exposes only state available at each pipeline stage", () => {
		const raw: RawPdfNode = { text: "raw" };
		const preprocessed: PreprocessedPdfNode = { text: "preprocessed" };
		const measured: MeasuredPdfNode = { text: "measured", _minWidth: 10 };
		const layout: LayoutPdfNode = { text: "layout", _minWidth: 10, positions: [] };

		// @ts-expect-error Measurement state is unavailable on raw nodes.
		void raw._minWidth;
		// @ts-expect-error Measurement state is unavailable on preprocessed nodes.
		void preprocessed._minWidth;
		// @ts-expect-error Layout state is unavailable on measured nodes.
		void measured.positions;

		expect(layout._minWidth).toBe(10);
		expect(layout.positions).toEqual([]);
	});
});
