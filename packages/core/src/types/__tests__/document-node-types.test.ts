import { describe, expect, it } from "vitest";

import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode, RawPdfNode } from "../internal";

describe("document node lifecycle types", () => {
	it("exposes only state available at each pipeline stage", () => {
		const raw: RawPdfNode = { text: "raw" };
		const preprocessed: PreprocessedPdfNode = { _kind: "text", text: "preprocessed" };
		const measured: MeasuredPdfNode = {
			_kind: "text",
			text: "measured",
			metrics: { inlines: [] },
			_minWidth: 10,
		};
		const layout: LayoutPdfNode = {
			_kind: "text",
			text: "layout",
			metrics: { inlines: [] },
			_minWidth: 10,
			positions: [],
		};

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
