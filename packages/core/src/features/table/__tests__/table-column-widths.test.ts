import { assert, describe, it } from "vitest";
import ColumnCalculator from "../../../layout/column-calculator.ts";
import type { ColumnWidth } from "../../../types/internal.ts";
import { getPercentageReservedWidths } from "../table-processor.helpers.ts";
import type { LayoutTableNode } from "../table.types.ts";

type LayoutFixture = {
	paddingLeft(index: number): number;
	paddingRight(index: number): number;
	vLineWidth(index: number): number;
};

const createTableNode = (widths: ColumnWidth[], layout: LayoutFixture): LayoutTableNode =>
	({ table: { widths, body: [] }, metrics: { layout } }) as unknown as LayoutTableNode;

describe("table percentage widths", function () {
	it("reserves padding and borders at the original column index in mixed-width tables (#2180)", function () {
		const columns: ColumnWidth[] = [
			{ width: "auto", _minWidth: 10, _maxWidth: 10 },
			{ width: "50%", _minWidth: 10, _maxWidth: 10 },
			{ width: "*", _minWidth: 10, _maxWidth: 10 },
		];
		const tableNode = createTableNode(columns, {
			paddingLeft: (index) => index,
			paddingRight: (index) => index + 1,
			vLineWidth: (index) => index * 2,
		});

		// Padding 1 + 2 and half of borders 2/2 + 4/2; other columns reserve nothing.
		assert.deepEqual(getPercentageReservedWidths(tableNode), [0, 6, 0]);

		ColumnCalculator.buildColumnWidths(columns, 90, 10, getPercentageReservedWidths(tableNode));
		assert.equal(columns[1]._calcWidth, 44);
	});

	it("should calculate widths of the table columns correctly when using percentages", function () {
		const availableWidth = 149;
		const offsetTotal = 51;
		const columns: ColumnWidth[] = [
			{ width: "50%", _minWidth: 22.27734375, _maxWidth: 22.27734375 },
			{ width: "25%", _minWidth: 22.27734375, _maxWidth: 22.27734375 },
			{ width: "25%", _minWidth: 22.27734375, _maxWidth: 22.27734375 },
		];
		const borders = [4, 6, 5, 4];
		const tableNode = createTableNode(columns, {
			vLineWidth: (index) => borders[index] ?? 0,
			paddingLeft: (index) => (index === 0 ? 5 : 3),
			paddingRight: () => 7,
		});

		ColumnCalculator.buildColumnWidths(
			columns,
			availableWidth,
			offsetTotal,
			getPercentageReservedWidths(tableNode),
		);
		// 200 Total available width (availableWidth + offsetTotal) === 149 + 51
		// Fist column is 50% width of 200 === 100
		// 100 - 4 borderLeft - 6/2 = 3 borderRight - 5 paddingLeft - 7 paddingRight
		assert.equal(columns[0].width, "50%");
		assert.equal(columns[0]._calcWidth, 81);
		// Second column has 25% width of 200 which is 50
		// 50 - 3 (6/2) borderLeft - 2.5 (5/2) borderRight - 3 paddingLeft - 7 paddingRight
		assert.equal(columns[1].width, "25%");
		assert.equal(columns[1]._calcWidth, 34.5);
		// Third column has 25% width of 200 which is 50
		// 50 - 2.5 (5/2) borderLeft - 4 borderRight - 3 paddingLeft - 7 paddingRight
		assert.equal(columns[2].width, "25%");
		assert.equal(columns[2]._calcWidth, 33.5);
		// The sum of all column width should be equal to totalAvailableWidth - offsetTotal
		assert.equal(availableWidth, 81 + 34.5 + 33.5);
	});
});
