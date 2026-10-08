import { describe, expect, it } from "vitest";

import type { PdfNode } from "../../types/internal";
import { defaultTableLayout, tableLayouts } from "../table-layouts";

const node = {
	table: {
		headerRows: 1,
		widths: [
			{ width: "*", _minWidth: 0, _maxWidth: 0 },
			{ width: "*", _minWidth: 0, _maxWidth: 0 },
		],
		body: [
			[{ text: "A" }, { text: "B" }],
			[{ text: "C" }, { text: "D" }],
		],
	},
} as unknown as PdfNode;

describe("table layouts", () => {
	it("removes borders and outer padding in noBorders", () => {
		const layout = tableLayouts.noBorders;
		expect(layout.hLineWidth?.(1)).toBe(0);
		expect(layout.vLineWidth?.(1)).toBe(0);
		expect(layout.paddingLeft?.(0)).toBe(0);
		expect(layout.paddingLeft?.(1)).toBe(4);
		expect(layout.paddingRight?.(0, node)).toBe(4);
		expect(layout.paddingRight?.(1, node)).toBe(0);
	});

	it("draws only the configured header separator in headerLineOnly", () => {
		const layout = tableLayouts.headerLineOnly;
		expect([0, 1, 2].map((index) => layout.hLineWidth?.(index, node))).toEqual([0, 2, 0]);
		expect(layout.vLineWidth?.(0)).toBe(0);
		expect(layout.paddingLeft?.(0)).toBe(0);
		expect(layout.paddingLeft?.(1)).toBe(8);
		expect(layout.paddingRight?.(0, node)).toBe(8);
		expect(layout.paddingRight?.(1, node)).toBe(0);
	});

	it("draws light horizontal row separators", () => {
		const layout = tableLayouts.lightHorizontalLines;
		expect([0, 1, 2].map((index) => layout.hLineWidth?.(index, node))).toEqual([0, 2, 0]);
		expect(layout.hLineColor?.(1)).toBe("black");
		expect(layout.hLineColor?.(2)).toBe("#aaa");
		expect(layout.vLineWidth?.(1)).toBe(0);
		expect(layout.paddingLeft?.(0)).toBe(0);
		expect(layout.paddingRight?.(1, node)).toBe(0);
	});

	it("provides complete default table behavior", () => {
		expect(defaultTableLayout.hLineWidth(0, node)).toBe(1);
		expect(defaultTableLayout.vLineWidth(0, node)).toBe(1);
		expect(defaultTableLayout.hLineColor(0, node)).toBe("black");
		expect(defaultTableLayout.vLineColor(0, node)).toBe("black");
		expect(defaultTableLayout.hLineStyle(0, node)).toBeNull();
		expect(defaultTableLayout.vLineStyle(0, node)).toBeNull();
		expect(defaultTableLayout.paddingLeft(0, node)).toBe(4);
		expect(defaultTableLayout.paddingRight(0, node)).toBe(4);
		expect(defaultTableLayout.paddingTop(0, node)).toBe(2);
		expect(defaultTableLayout.paddingBottom(0, node)).toBe(2);
		expect(defaultTableLayout.fillColor(0, node)).toBeNull();
		expect(defaultTableLayout.fillOpacity(0, node)).toBe(1);
		expect(defaultTableLayout.defaultBorder).toBe(true);
	});
});
