import { assert, describe, it } from "vitest";
import ColumnCalculator from "../column-calculator.ts";
import type { ColumnWidth } from "../../types/internal";

describe("ColumnCalculator", function () {
	describe("buildColumnWidths", function () {
		it("should set calcWidth to specified width for fixed columns", function () {
			const columns: ColumnWidth[] = [
				{ width: 50, _minWidth: 30, _maxWidth: 80 },
				{ width: 35, _minWidth: 30, _maxWidth: 80 },
				{ width: 20, _minWidth: 30, _maxWidth: 80 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function (col) {
				assert.equal(col._calcWidth, col.width);
			});
		});

		it("should set calcWidth to minWidth for fixed columns with elasticWidth set to true", function () {
			const columns: ColumnWidth[] = [
				{ width: 50, _minWidth: 30, _maxWidth: 80 },
				{ width: 35, _minWidth: 30, _maxWidth: 80 },
				{ width: 20, _minWidth: 30, _maxWidth: 80, elasticWidth: true },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			assert.equal(columns[0]._calcWidth, columns[0].width);
			assert.equal(columns[1]._calcWidth, columns[1].width);
			assert.equal(columns[2]._calcWidth, columns[2]._minWidth);
		});

		it("should set auto to maxWidth if there is enough space for all columns", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 30, _maxWidth: 41 },
				{ width: "auto", _minWidth: 30, _maxWidth: 42 },
				{ width: "auto", _minWidth: 30, _maxWidth: 43 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function (col) {
				assert.equal(col._calcWidth, col._maxWidth);
			});
		});

		it("should equally divide availableSpace to star columns", function () {
			const columns: ColumnWidth[] = [
				{ width: "*", _minWidth: 30, _maxWidth: 41 },
				{ width: "star", _minWidth: 30, _maxWidth: 42 },
				{ _minWidth: 30, _maxWidth: 43 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			columns.forEach(function (col) {
				assert.equal(col._calcWidth, 320 / 3);
			});
		});

		it("should proportionally constrain auto columns when their minimums exceed the page", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 300, _maxWidth: 410 },
				{ width: "auto", _minWidth: 301, _maxWidth: 420 },
				{ width: "auto", _minWidth: 303, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);

			assert.equal(
				columns.reduce((total, col) => total + (col._calcWidth ?? 0), 0),
				320,
			);
			assert.approximately(columns[0]._calcWidth! / columns[1]._calcWidth!, 300 / 301, 1e-12);
		});

		it("should proportionally constrain mixed flexible columns when minimums exceed the page", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 300, _maxWidth: 410 },
				{ width: "*", _minWidth: 301, _maxWidth: 420 },
				{ width: "star", _minWidth: 303, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);
			assert.approximately(
				columns.reduce((total, col) => total + (col._calcWidth ?? 0), 0),
				320,
				1e-12,
			);
			assert.equal(columns[1]._calcWidth, columns[2]._calcWidth);
		});

		it("should make columns wider proportionally if table can fit within the available space", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 30, _maxWidth: 41 },
				{ width: "auto", _minWidth: 31, _maxWidth: 42 },
				{ width: "auto", _minWidth: 33, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);
			assert((columns[0]._calcWidth ?? 0) > 30);
			assert((columns[1]._calcWidth ?? 0) > 31);
			assert((columns[2]._calcWidth ?? 0) > 220);
		});

		it("should first take into account auto columns and then divide remaining space equally between all star if there is enough space for the table", function () {
			const columns: ColumnWidth[] = [
				{ width: "*", _minWidth: 30, _maxWidth: 41 },
				{ width: "auto", _minWidth: 31, _maxWidth: 42 },
				{ width: "*", _minWidth: 33, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, 320);
			assert.equal(columns[1]._calcWidth, 42);
			assert.equal(columns[0]._calcWidth, columns[0]._calcWidth);
			assert.equal(
				(columns[0]._calcWidth ?? 0) + (columns[1]._calcWidth ?? 0) + (columns[2]._calcWidth ?? 0),
				320,
			);
		});

		it("keeps an auto column at its natural width before assigning star space (#2129)", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 35, _maxWidth: 100 },
				{ width: "*", _minWidth: 50, _maxWidth: 400 },
			];

			ColumnCalculator.buildColumnWidths(columns, 300);

			assert.equal(columns[0]._calcWidth, 100);
			assert.equal(columns[1]._calcWidth, 200);
		});

		it("subtracts the reserved width of a percentage column at its original index (#2180)", function () {
			const columns: ColumnWidth[] = [
				{ width: "auto", _minWidth: 10, _maxWidth: 10 },
				{ width: "50%", _minWidth: 10, _maxWidth: 10 },
				{ width: "*", _minWidth: 10, _maxWidth: 10 },
			];

			ColumnCalculator.buildColumnWidths(columns, 90, 10, [0, 6, 0]);

			// 50% of 100, less the 6 reserved for the second column.
			assert.equal(columns[1].width, "50%");
			assert.equal(columns[1]._calcWidth, 44);
		});

		it("should calculate widths of columns correctly", function () {
			const availableWidth = 200;
			const columns: ColumnWidth[] = [
				{ width: "25%", _minWidth: 30, _maxWidth: 41 },
				{ width: "50%", _minWidth: 31, _maxWidth: 42 },
				{ width: "25%", _minWidth: 33, _maxWidth: 421 },
			];

			ColumnCalculator.buildColumnWidths(columns, availableWidth);
			assert.equal(columns[0]._calcWidth, 50);
			assert.equal(columns[1]._calcWidth, 100);
			assert.equal(columns[2]._calcWidth, 50);
		});

		it("should calculate percentage widths from the total width less reserved widths", function () {
			const availableWidth = 149;
			const offsetTotal = 51;
			const columns: ColumnWidth[] = [
				{ width: "50%", _minWidth: 22.27734375, _maxWidth: 22.27734375 },
				{ width: "25%", _minWidth: 22.27734375, _maxWidth: 22.27734375 },
				{ width: "25%", _minWidth: 22.27734375, _maxWidth: 22.27734375 },
			];

			ColumnCalculator.buildColumnWidths(columns, availableWidth, offsetTotal, [19, 15.5, 16.5]);
			// 200 Total available width (availableWidth + offsetTotal) === 149 + 51
			assert.equal(columns[0].width, "50%");
			assert.equal(columns[0]._calcWidth, 100 - 19);
			assert.equal(columns[1].width, "25%");
			assert.equal(columns[1]._calcWidth, 50 - 15.5);
			assert.equal(columns[2].width, "25%");
			assert.equal(columns[2]._calcWidth, 50 - 16.5);
			// The sum of all column width should be equal to totalAvailableWidth - offsetTotal
			assert.equal(availableWidth, 81 + 34.5 + 33.5);
		});

		it("recalculates percentage widths without mutating their definitions", function () {
			const columns: ColumnWidth[] = [{ width: "50%", _minWidth: 10, _maxWidth: 10 }];

			ColumnCalculator.buildColumnWidths(columns, 200);
			assert.equal(columns[0]._calcWidth, 100);
			ColumnCalculator.buildColumnWidths(columns, 300);

			assert.equal(columns[0].width, "50%");
			assert.equal(columns[0]._calcWidth, 150);
		});
	});

	describe("measureMinMax", function () {
		it("uses the largest star measurements for every star column", function () {
			const result = ColumnCalculator.measureMinMax([
				{ width: "auto", _minWidth: 10, _maxWidth: 20 },
				{ width: "*", _minWidth: 15, _maxWidth: 30 },
				{ width: "star", _minWidth: 25, _maxWidth: 40 },
				{ width: 50, _minWidth: 60, _maxWidth: 70 },
			]);

			assert.deepEqual(result, { min: 110, max: 150 });
		});
	});
});
