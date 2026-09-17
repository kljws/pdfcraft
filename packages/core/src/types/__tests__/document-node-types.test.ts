import { describe, expect, it } from "vitest";

import type { ListNode } from "../content.types";
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

describe("list node types", () => {
	it("requires exactly one list variant", () => {
		const unordered = { ul: ["One", "Two"] } satisfies ListNode;
		const ordered = { ol: ["One", "Two"] } satisfies ListNode;

		// @ts-expect-error A list cannot define both `ul` and `ol`.
		const ambiguous = { ul: ["One"], ol: ["One"] } satisfies ListNode;
		// @ts-expect-error A list must define either `ul` or `ol`.
		const empty = {} satisfies ListNode;

		expect(unordered.ul).toEqual(["One", "Two"]);
		expect(ordered.ol).toEqual(["One", "Two"]);
		void ambiguous;
		void empty;
	});
});
