import type { LayoutTableCell } from "../table.types.ts";
import { assert, beforeEach, describe, it } from "vitest";
import DocumentContext from "../../../document/document-context.ts";
import BaseLayoutBuilder from "../../../layout/layout-builder.ts";
import ColumnCalculator from "../../../layout/column-calculator.ts";
import PageElementWriter from "../../../layout/element-writer.page.ts";
import { createBuiltInElementPlacement } from "../../../composition/built-in-feature-registry.ts";
import { createTestMeasurement } from "../../../__tests__/fixtures/measurement.ts";
import { createBuiltInPreprocessing } from "../../../composition/built-in-preprocessing.ts";
import type PDFDocument from "../../../rendering/pdf-document.ts";
import type { ColumnWidth, PageSize } from "../../../types/internal.ts";
import TableRowLayout from "../layout-row.ts";

var sampleTestProvider = {
	provideFont: function (_familyName: string, bold: boolean, italics: boolean) {
		return {
			widthOfString: function (text: string, size: number) {
				return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
			},
			lineHeight: function (size: number) {
				return size;
			},
			ascender: 150,
			descender: -50,
		};
	},
};

describe("Table row layout", function () {
	describe("processRow", function () {
		var builder: BaseLayoutBuilder;
		var rowLayout: TableRowLayout;
		interface RowCellFixture {
			stack: Array<{ text: string; pageBreak?: "after" }>;
		}
		interface TableFixture {
			table: {
				headerRows: number;
				widths: ColumnWidth[];
				body: LayoutTableCell[][];
			};
			metrics: { offsets: { offsets: number[] } };
		}

		function createTable(
			headerRows: number,
			otherRows: number,
			singleRowLines = 1,
			pageBreakAfter?: number,
			secondColumnPageBreakAfter?: number,
		): TableFixture {
			const rowsData: RowCellFixture[][] = [];

			var rows = headerRows + otherRows;
			while (rows--) {
				var stack1: RowCellFixture = { stack: [{ text: "a" }] };
				var stack2: RowCellFixture = { stack: [{ text: "a" }] };
				for (var x = 0; x < singleRowLines; x++) {
					stack1.stack.push({ text: "a" });
					stack2.stack.push({ text: "b" });
				}
				if (pageBreakAfter) {
					stack1.stack[pageBreakAfter - 1].pageBreak = "after";
				}
				if (secondColumnPageBreakAfter) {
					stack2.stack[secondColumnPageBreakAfter - 1].pageBreak = "after";
				}

				rowsData.push([stack1, stack2]);
			}
			const tableNode = {
				table: {
					widths: [100, 100],
					header: headerRows > 0 ? { rows: rowsData.slice(0, headerRows) } : undefined,
					body: {
						groups: otherRows > 0 ? [{ rows: rowsData.slice(headerRows) }] : [],
					},
				},
			};

			const preprocessedTable = createBuiltInPreprocessing().preprocessDocument(tableNode);
			const measuredTable = createTestMeasurement(
				sampleTestProvider as unknown as PDFDocument,
				{},
				{},
			).measureNode(preprocessedTable) as unknown as TableFixture;
			ColumnCalculator.buildColumnWidths(measuredTable.table.widths, 320);

			return measuredTable;
		}

		beforeEach(function () {
			var pageSize: PageSize = { width: 400, height: 800, orientation: "portrait" };
			var pageMargins = { left: 40, top: 40, bottom: 40, right: 40 };

			builder = new BaseLayoutBuilder(pageSize, pageMargins);
			var ctx = new DocumentContext();
			ctx.addPage(pageSize, pageMargins);
			builder.writer = new PageElementWriter(ctx, createBuiltInElementPlacement());
			builder.linearNodeList = [];
			rowLayout = new TableRowLayout(builder);
		});

		it("should return an empty array if no page breaks occur", function () {
			var doc = createTable(1, 0);

			var result = rowLayout.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc.metrics.offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0,
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 0);
		});

		it("on page break should return an entry with ending/starting positions", function () {
			var doc = createTable(0, 1, 10, 5, 5);
			var result = rowLayout.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc.metrics.offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0,
			});
			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 1);
			assert.equal(result.pageBreaks[0].prevPage, 0);
			assert.equal(result.pageBreaks[0].prevY, 40 + 12 * 6);
		});

		it("on page break should return an entry with ending/starting positions 2", function () {
			var doc = createTable(0, 1, 10, 5);
			var result = rowLayout.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc.metrics.offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0,
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 1);
			assert.equal(result.pageBreaks[0].prevPage, 0);

			assert.equal(result.pageBreaks[0].prevY, 40 + 12 * 5);
		});

		it("on multi-pass page break (columns or table columns) should treat bottom-most page-break as the ending position ", function () {
			var doc = createTable(0, 1, 10, 5, 7);
			var result = rowLayout.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc.metrics.offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0,
			});

			assert.equal(result.pageBreaks[0].prevY, 40 + 12 * 7);
		});

		it("on multiple page breaks (more than 2 pages), should return all entries with ending/starting positions", function () {
			var doc = createTable(0, 1, 100, 90, 90);
			var result = rowLayout.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc.metrics.offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0,
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 2);
			assert.equal(result.pageBreaks[0].prevPage, 0);
			assert.equal(result.pageBreaks[0].prevY, 40 + 60 * 12);
			assert.equal(result.pageBreaks[1].prevPage, 1);
			assert.equal(result.pageBreaks[1].prevY, 40 + (90 - 60) * 12);
		});

		it("on multiple page breaks (more than 2 pages), should return all entries with ending/starting positions 2", function () {
			var doc = createTable(0, 1, 100, 90, 90);
			var result = rowLayout.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc.metrics.offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0,
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 2);
			assert.equal(result.pageBreaks[0].prevPage, 0);
			assert.equal(result.pageBreaks[0].prevY, 40 + 60 * 12);
			assert.equal(result.pageBreaks[1].prevPage, 1);
			assert.equal(result.pageBreaks[1].prevY, 40 + 30 * 12);
		});

		it("on multiple and multi-pass page breaks should calculate bottom-most endings for every page", function () {
			var doc = createTable(0, 1, 100, 90, 92);
			var result = rowLayout.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc.metrics.offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0,
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 2);
			assert.equal(result.pageBreaks[0].prevPage, 0);
			assert.equal(result.pageBreaks[0].prevY, 40 + 60 * 12);
			assert.equal(result.pageBreaks[1].prevPage, 1);
			assert.equal(result.pageBreaks[1].prevY, 40 + (92 - 60) * 12);
		});
	});
});
