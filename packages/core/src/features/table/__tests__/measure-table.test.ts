import { assert, beforeEach, describe, it } from "vitest";
import { createBuiltInPreprocessing } from "../../../composition/built-in-preprocessing.ts";
import {
	createTestMeasurement,
	sampleTestProvider,
} from "../../../__tests__/fixtures/measurement.ts";
import type {
	ColumnWidth,
	PdfNode,
	PdfTable,
	TableLayout,
} from "../../../types/internal.ts";
import type { MeasuredTableNode } from "../table.types.ts";

interface MeasuredFixture extends PdfNode {
	_minWidth: number;
	_maxWidth: number;
	table: PdfTable & { body: MeasuredFixture[][] };
}

interface FixtureTableBody extends Array<MeasuredFixture[]> {
	push(...items: unknown[][]): number;
}

interface TableNodeFixture extends Omit<PdfNode, "layout" | "table"> {
	layout?: Partial<TableLayout>;
	table: Omit<PdfTable, "body" | "widths"> & {
		body: FixtureTableBody;
		widths: ColumnWidth[];
		headerLines?: number;
	};
}

var emptyTableLayout: TableLayout = {
	defaultBorder: true,
	hLineWidth: function () {
		return 0;
	},
	vLineWidth: function () {
		return 0;
	},
	hLineColor: function () {
		return "black";
	},
	vLineColor: function () {
		return "black";
	},
	hLineStyle: function () {
		return null;
	},
	vLineStyle: function () {
		return null;
	},
	paddingLeft: function () {
		return 0;
	},
	paddingRight: function () {
		return 0;
	},
	paddingTop: function () {
		return 0;
	},
	paddingBottom: function () {
		return 0;
	},
};

const docMeasure = createTestMeasurement<MeasuredFixture>(sampleTestProvider);
const docPreprocessor = createBuiltInPreprocessing();

describe("Table measurement", function () {
	describe("measureTable", function () {
		var tableNode: TableNodeFixture;

		beforeEach(function () {
			tableNode = {
				table: {
					headerLines: 1,
					widths: ["*", 150, "auto", "auto"],
					body: {
						groups: [
							{
								rows: [
									["Header 1", "H2", "Header\nwith\nlines", { text: "last", fontSize: 20 }],
									["Column 1", "Column 2", "Column 3", "Column 4"],
									[
										"A text in the first column",
										"Text in the second one",
										"Other things go here",
										"or here",
									],
								],
							},
						],
						layout: {
							vLineWidth: function () {
								return 0;
							},
							hLineWidth: function () {
								return 0;
							},
							paddingLeft: function () {
								return 0;
							},
							paddingRight: function () {
								return 0;
							},
						},
					},
				},
			} as unknown as TableNodeFixture;
		});

		it("should extend document-definition-object", function () {
			docPreprocessor.preprocessBlock(tableNode);
			var result = docMeasure.measureNode(tableNode);
			const measuredTable = result as unknown as MeasuredTableNode;

			assert(measuredTable.metrics.offsets);
			assert(measuredTable.metrics.layout);
			assert.notProperty(measuredTable, "_offsets");
			assert.notProperty(measuredTable, "_layout");
			assert(result.table.body[0][0]._minWidth);
			assert(result.table.body[0][0]._maxWidth);
			assert(result.table.body[0][3]._minWidth);
			assert(result.table.body[0][3]._maxWidth);
			assert(result.table.widths[0]._maxWidth);
			assert(result.table.widths[0]._minWidth);
			assert(result.table.widths[0].width);
		});

		it("inherits table-cell borders and fills from named styles", function () {
			const styledMeasure = createTestMeasurement<MeasuredFixture>(sampleTestProvider, {
				cell: {
					border: [true, false, true, false],
					borderColor: ["red", "green", "blue", "black"],
					fillColor: "yellow",
					fillOpacity: 0.5,
				},
			});
			const node = {
				table: { body: { groups: [{ rows: [[{ text: "Styled", style: "cell" }]] }] } },
			};

			docPreprocessor.preprocessBlock(node);
			const cell = styledMeasure.measureNode(node).table.body[0][0];

			assert.deepEqual(cell.border, [true, false, true, false]);
			assert.deepEqual(cell.borderColor, ["red", "green", "blue", "black"]);
			assert.equal(cell.fillColor, "yellow");
			assert.equal(cell.fillOpacity, 0.5);
		});

		it("should not spoil widths if measureTable has been called before", function () {
			docPreprocessor.preprocessBlock(tableNode);
			var result = docMeasure.measureNode(tableNode);
			result = docMeasure.measureNode(result);

			assert(result.table.widths[0]._maxWidth);
			assert(result.table.widths[0]._minWidth);
			assert(result.table.widths[0].width);
			assert.equal(result.table.widths[0].width, "*");
		});

		it("should calculate _minWidth and _maxWidth for all columns", function () {
			docPreprocessor.preprocessBlock(tableNode);
			var result = docMeasure.measureNode(tableNode);

			result.table.widths.forEach(function (width) {
				assert(width._maxWidth);
				assert(width._minWidth);
				assert(width.width);
			});
		});

		it("should set _minWidth and _maxWidth of each column to min/max width or the largest cell", function () {
			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);

			assert.equal(tableNode.table.widths[0]._minWidth, 6 * 12);
			assert.equal(tableNode.table.widths[0]._maxWidth, 26 * 12);
		});

		it("should support single-width-definition and extend it to an array of widths", function () {
			var node = {
				table: {
					headerLines: 1,
					widths: "auto",
					body: {
						groups: [
							{
								rows: [
									["Header 1", "H2", "Header\nwith\nlines", { text: "last", fontSize: 20 }],
									["Column 1", "Column 2", "Column 3", "Column 4"],
									[
										"A text in the first column",
										"Text in the second one",
										"Other things go here",
										"or here",
									],
								],
							},
						],
					},
				},
			};

			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert(result.table.widths instanceof Array);
			assert.equal(result.table.widths.length, 4);
			result.table.widths.forEach(function (w) {
				assert.equal(w.width, "auto");
			});
		});

		it("should set _minWidth and _maxWidth to the sum of column min/max widths", function () {
			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);

			assert.equal(tableNode._minWidth, 150 + 6 * 12 + 6 * 12 + 4 * 20);
			assert.equal(tableNode._maxWidth, 798);
		});

		it("should support column spans", function () {
			(
				tableNode.table.body as unknown as { groups: Array<{ rows: unknown[][] }> }
			).groups[0].rows.push([{ text: "Column 1", colSpan: 2 }, {}, "Column 3", "Column 4"]);

			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);
		});

		it("should mark cells directly following colSpan-cell with _span property and set min/maxWidth to 0", function () {
			(
				tableNode.table.body as unknown as { groups: Array<{ rows: unknown[][] }> }
			).groups[0].rows.push([{ text: "Col 1", colSpan: 3 }, {}, {}, "Col 4"]);
			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);

			var rows = tableNode.table.body.length;
			assert(tableNode.table.body[rows - 1][1]._span !== undefined);
			assert(tableNode.table.body[rows - 1][2]._span !== undefined);
			assert(tableNode.table.body[rows - 1][3]._span === undefined);
			assert.equal(tableNode.table.body[rows - 1][1]._minWidth, 0);
			assert.equal(tableNode.table.body[rows - 1][1]._maxWidth, 0);
			assert.equal(tableNode.table.body[rows - 1][2]._minWidth, 0);
			assert.equal(tableNode.table.body[rows - 1][2]._maxWidth, 0);
		});

		it("spanning cells should not influence min/max column widths if their min/max widths are lower or equal", function () {
			(tableNode.table.body as unknown as { layout: unknown }).layout = emptyTableLayout;

			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);
			var col0min = tableNode.table.widths[0]._minWidth;
			var col0max = tableNode.table.widths[0]._maxWidth;
			var col1min = tableNode.table.widths[1]._minWidth;
			var col1max = tableNode.table.widths[1]._maxWidth;

			tableNode.table.body.push([{ text: "Co1", colSpan: 2 }, {}, "Column 3", "Column 4"]);
			tableNode.table.body.push([{ text: "123456789012", colSpan: 2 }, {}, "Column 3", "Column 4"]);
			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);

			assert.equal(tableNode.table.widths[0]._minWidth, col0min);
			assert.equal(tableNode.table.widths[0]._maxWidth, col0max);
			assert.equal(tableNode.table.widths[1]._minWidth, col1min);
			assert.equal(tableNode.table.widths[1]._maxWidth, col1max);
		});

		it("assigns spanning-cell minimum growth to star columns before fixed columns", function () {
			(tableNode.table.body as unknown as { layout: unknown }).layout = emptyTableLayout;

			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);
			var col0min = tableNode.table.widths[0]._minWidth;
			var col1min = tableNode.table.widths[1]._minWidth;

			assert.equal(col0min, 6 * 12);
			assert.equal(col1min, 6 * 12);

			// make sure we know default values for

			tableNode.table.body.push([
				{ text: "thisislongera", colSpan: 2 },
				{},
				"Column 3",
				"Column 4",
			]);
			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);

			assert(tableNode.table.widths[0]._minWidth > col0min);
			assert.equal(tableNode.table.widths[1]._minWidth, col1min);

			assert.equal(tableNode.table.widths[0]._minWidth, col0min + 1 * 12);
		});

		it("assigns spanning-cell maximum growth to star columns before fixed columns", function () {
			(tableNode.table.body as unknown as { layout: unknown }).layout = emptyTableLayout;

			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);
			var col0max = tableNode.table.widths[0]._maxWidth;
			var col1max = tableNode.table.widths[1]._maxWidth;

			assert.equal(col0max, 26 * 12);
			assert.equal(col1max, 22 * 12);

			tableNode.table.body.push([
				{ text: "1234 6789 1234 6789 1234 6789 1234 6789 1234 6789", colSpan: 2 },
				{},
				"Column 3",
				"Column 4",
			]);
			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);

			assert.equal(tableNode.table.widths[0]._maxWidth, col0max + 1 * 12);
			assert.equal(tableNode.table.widths[1]._maxWidth, col1max);
		});

		it("calculating widths (when colSpan are used) should take into account cell padding and borders", function () {
			// 5 + 3 + 4 == 12 --- the exact width of the overflowing letter in thisislongera
			// it means we have enough space and there's no need to change column widths
			(tableNode.table.body as unknown as { layout: unknown }).layout = {
				vLineWidth: function () {
					return 5;
				},
				paddingLeft: function () {
					return 3;
				},
				paddingRight: function () {
					return 4;
				},
			};

			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);
			var col0min = tableNode.table.widths[0]._minWidth;
			var col1min = tableNode.table.widths[1]._minWidth;

			assert.equal(col0min, 6 * 12);
			assert.equal(col1min, 6 * 12);

			tableNode.table.body.push([
				{ text: "thisislongera", colSpan: 2 },
				{},
				"Column 3",
				"Column 4",
			]);
			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);

			assert.equal(tableNode.table.widths[0]._minWidth, col0min);
			assert.equal(tableNode.table.widths[1]._minWidth, col1min);
		});

		it("should mark cells directly below rowSpan-cell with _span property and set min/maxWidth to 0", function () {
			const rawRows = (tableNode.table.body as unknown as { groups: Array<{ rows: unknown[][] }> })
				.groups[0].rows;
			rawRows.push([{ text: "Col 1", rowSpan: 3 }, "Col2", "Col 3", "Col 4"]);
			rawRows.push([{}, "Col2", "Col 3", "Col 4"]);
			rawRows.push([{}, "Col2", "Col 3", "Col 4"]);
			rawRows.push(["Another", "Col2", "Col 3", "Col 4"]);
			docPreprocessor.preprocessBlock(tableNode);
			docMeasure.measureNode(tableNode);

			var rows = tableNode.table.body.length;
			assert(tableNode.table.body[rows - 3][0]._span !== undefined);
			assert(tableNode.table.body[rows - 2][0]._span !== undefined);
			assert(tableNode.table.body[rows - 1][0]._span === undefined);

			assert.equal(tableNode.table.body[rows - 3][0]._minWidth, 0);
			assert.equal(tableNode.table.body[rows - 3][0]._maxWidth, 0);
			assert.equal(tableNode.table.body[rows - 2][0]._minWidth, 0);
			assert.equal(tableNode.table.body[rows - 2][0]._maxWidth, 0);
			assert(tableNode.table.body[rows - 1][0]._minWidth !== 0);
			assert(tableNode.table.body[rows - 1][0]._maxWidth !== 0);
		});
	});
});
