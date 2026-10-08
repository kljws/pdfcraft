import { assert, describe, it } from "vitest";
import { createBuiltInPreprocessing } from "../../../composition/built-in-preprocessing.ts";
import {
	createTestMeasurement,
	sampleTestProvider,
} from "../../../__tests__/fixtures/measurement.ts";
import type { MeasuredTableNode } from "../../table/table.types.ts";
import type { MeasuredTocNode } from "../toc.types.ts";

describe("table of contents measurement", function () {
	it("presents its entries as a normalized borderless table whose rows never break", function () {
		const root = createBuiltInPreprocessing().preprocessDocument([
			{ toc: { title: "Contents" } },
			{ text: "Alpha", tocItem: true },
			{ text: "Beta", tocItem: true },
		]);
		const measured = createTestMeasurement<{ stack: MeasuredTocNode[] }>(
			sampleTestProvider,
		).measureNode(root);
		const table = measured.stack[0]?.toc._table as MeasuredTableNode | undefined;

		assert.equal(table?._kind, "table");
		assert.equal(table?.table.headerRows, 0);
		assert.equal(table?.table.body.length, 2);
		assert.deepEqual(
			table?.table.widths.map((column) => column.width),
			["*", "auto"],
		);
		assert.equal(table?.table._bodyLayout, "noBorders");
		assert.deepEqual(
			table?.table._rowGroups?.map(({ startRow, endRow, keepTogether, dontBreakRows }) => ({
				startRow,
				endRow,
				keepTogether,
				dontBreakRows,
			})),
			[{ startRow: 0, endRow: 1, keepTogether: false, dontBreakRows: true }],
		);
		assert.notProperty(table?.table ?? {}, "dontBreakRows");
	});
});
