import { assert, beforeEach, describe, it, vi } from "vitest";
import type DocumentContext from "../../document/document-context.ts";
import type PageElementWriter from "../element-writer.page.ts";
import BaseTableProcessor from "../table-processor.ts";
import type { TablePageBreak } from "../layout-builder.table.ts";
import type { ResolvedTableLayout } from "../table-processor.types.ts";
import { resetTableLayoutState } from "../table-processor.lifecycle.ts";
import type { PdfNode, Vector } from "../../types/internal.ts";

interface MutableTableFixture {
	table: {
		widths: Array<{ width: string | number }>;
		body: unknown[][];
		headerRows?: unknown;
		keepWithHeaderRows?: unknown;
	};
	_offsets: { total: number };
	_layout: Record<string, () => void>;
}

const asNode = (value: unknown): PdfNode => value as PdfNode;
const asWriter = (value: unknown): PageElementWriter => value as PageElementWriter;

class TableProcessor extends BaseTableProcessor {
	constructor(tableNode: unknown) {
		super(asNode(tableNode));
	}
}

describe("TableProcessor", function () {
	var defaultLayout: ResolvedTableLayout;
	var addVectorCallCount: number;
	var contextFake: DocumentContext;
	var writerFake: PageElementWriter;

	beforeEach(function () {
		defaultLayout = {
			hLineWidth: function (i, node) {
				return 1;
			},
			vLineWidth: function (i, node) {
				return 1;
			},
			hLineColor: function (i, node) {
				return "black";
			},
			vLineColor: function (i, node) {
				return "black";
			},
			hLineStyle: function (i, node) {
				return null;
			},
			vLineStyle: function (i, node) {
				return null;
			},
			paddingLeft: function (i, node) {
				return 4;
			},
			paddingRight: function (i, node) {
				return 4;
			},
			paddingTop: function (i, node) {
				return 2;
			},
			paddingBottom: function (i, node) {
				return 2;
			},
			fillColor: function (i, node) {
				return null;
			},
			fillOpacity: function (i, node) {
				return 1;
			},
			defaultBorder: true,
		};

		addVectorCallCount = 0;

		contextFake = {
			page: 0,
			x: 0,
			y: 0,
			availableWidth: 100,
			availableHeight: 100,
			moveDown: function () {},
		} as unknown as DocumentContext;

		writerFake = {
			context: function () {
				return contextFake;
			},
			addVector: function (vector: Vector) {
				assert.equal(vector.lineColor, "nice shiny color");
				addVectorCallCount++;
			},
			addListener: function () {},
			removeListener: function () {},
		} as unknown as PageElementWriter;
	});

	it("should use the line colors function (regression #161)", function () {
		writerFake.addVector = function (vector: Vector) {
			assert.equal(vector.lineColor, "nice shiny color");
			addVectorCallCount++;
		};

		var tableNode = {
			table: {
				body: [
					[{ text: "A1" }, { text: "A2" }],
					[{ text: "B1" }, { text: "B2" }],
				],
			},
		};

		var processor = new TableProcessor(asNode(tableNode));
		defaultLayout.vLineColor = function () {
			return "nice shiny color";
		};
		defaultLayout.hLineColor = function () {
			return "nice shiny color";
		};
		processor.layout = defaultLayout;
		processor.rowSpanData = [
			{ left: 0, rowSpan: 0 },
			{ left: 0, rowSpan: 0 },
		];

		processor.beginRow(0, writerFake);
		processor.endRow(0, writerFake, []);

		assert.equal(addVectorCallCount, 3);
	});

	it("should use the line colors constants (regression #161)", function () {
		writerFake.addVector = function (vector: Vector) {
			assert.equal(vector.lineColor, "nice shiny color");
			addVectorCallCount++;
		};

		var tableNode = {
			table: {
				body: [
					[{ text: "A1" }, { text: "A2" }],
					[{ text: "B1" }, { text: "B2" }],
				],
			},
		};

		var processor = new TableProcessor(asNode(tableNode));
		defaultLayout.vLineColor = "nice shiny color";
		defaultLayout.hLineColor = "nice shiny color";
		processor.layout = defaultLayout;
		processor.rowSpanData = [
			{ left: 0, rowSpan: 0 },
			{ left: 0, rowSpan: 0 },
		];

		processor.beginRow(0, writerFake);
		processor.endRow(0, writerFake, []);

		assert.equal(addVectorCallCount, 3);
	});

	it("uses the current row width when resolving vertical cell border colors", function () {
		const tableNode = {
			table: {
				body: [[{ text: "A1" }, { text: "A2", borderColor: ["red", "black", "black", "black"] }]],
			},
		};
		const processor = new TableProcessor(tableNode);
		processor.layout = defaultLayout;
		processor.rowSpanData = [
			{ left: 0, rowSpan: 0 },
			{ left: 50, rowSpan: 0 },
			{ left: 100, rowSpan: 0 },
		];
		writerFake.addVector = function (vector: Vector) {
			assert.equal(vector.lineColor, "red");
		};

		processor.drawVerticalLine(50, 0, 20, 1, writerFake, 0, 0);
	});

	it("clears table and cell layout metadata before a new pass", function () {
		const cell = {
			text: "A1",
			_bottomY: 20,
			_willBreak: true,
			_rowTopPageY: 10,
			_startingRowSpanPage: 1,
		};
		const tableNode = asNode({
			table: { body: [[cell]] },
			_breaksBySpan: [{ prevPage: 0, prevY: 10, y: 0 }],
			_bottomByPage: { 0: 20 },
		});

		resetTableLayoutState(tableNode);

		assert.notProperty(tableNode, "_breaksBySpan");
		assert.notProperty(tableNode, "_bottomByPage");
		assert.notProperty(cell, "_bottomY");
		assert.notProperty(cell, "_willBreak");
		assert.notProperty(cell, "_rowTopPageY");
		assert.notProperty(cell, "_startingRowSpanPage");
	});

	it("preserves available height while drawing a row across pages", function () {
		const tableNode = {
			table: {
				body: [[{ text: "row" }]],
			},
		};
		const processor = new TableProcessor(tableNode);
		processor.layout = defaultLayout;
		processor.rowSpanData = [
			{ left: 0, rowSpan: 0, width: 20 },
			{ left: 20, rowSpan: 0, width: 0 },
		];

		let pageChanged: (() => void) | undefined;
		const context = {
			page: 0,
			y: 20,
			availableHeight: 80,
			backgroundLength: [0, 0],
			moveDown(offset: number) {
				this.y += offset;
				this.availableHeight -= offset;
			},
		};
		const writer = asWriter({
			context: () => context,
			addListener: (_event: string, callback: () => void) => {
				pageChanged = callback;
			},
			removeListener: () => {},
			addVector: () => {},
		});

		processor.beginRow(0, writer);
		context.page = 1;
		context.y = 20;
		context.availableHeight = 80;
		pageChanged!();
		processor.endRow(0, writer, [{ prevPage: 0, prevY: 90, y: 20 }]);

		assert.equal(context.page, 1);
		assert.equal(context.y, 26);
		assert.equal(context.availableHeight, 74);
	});

	describe("header with nested table (issue #199)", function () {
		it("should not remove the repeatable of the outer table when nested table ends", function () {
			var fakeTableNode = function (): MutableTableFixture {
				return {
					table: {
						// since extendTableWidths is not called from out tests
						// we can't use the doc-definition syntax for widths
						// so instead of '*' we
						widths: [{ width: "*" }],
						body: [],
					},
					_offsets: {
						total: 56472,
					},
					_layout: {
						paddingLeft: function () {},
						paddingRight: function () {},
						paddingBottom: function () {},
						paddingTop: function () {},
						vLineWidth: function () {},
						hLineWidth: function () {},
						fillColor: function () {},
						fillOpacity: function () {},
					},
				};
			};

			var header = {};

			var nestedTableNode = fakeTableNode();
			nestedTableNode.table.body = [[{ text: "nested table cell" }]];

			var tableNode = fakeTableNode();
			tableNode.table.body = [[{ text: "Header" }], [nestedTableNode]];
			tableNode.table.headerRows = 1;

			var fakeWriter = {
				context: function () {
					return {
						page: 0,
						x: 0,
						y: 0,
						availableWidth: 56473,
						availableHeight: 100,
						moveDown: function () {},
					};
				},
				repeatables: [],
				removeListener: function () {},
				addVector: function () {},
				popFromRepeatables: vi.fn(),
				pushToRepeatables: function (repeatable: unknown) {
					assert.equal(repeatable, header);
				},
				beginUnbreakableBlock: function () {},
				currentBlockToRepeatable: function () {
					return header;
				},
				commitUnbreakableBlock: function () {},
			};

			var pageBreaks: TablePageBreak[] = [];
			var tableProcessor = new TableProcessor(asNode(tableNode));
			tableProcessor.beginTable(asWriter(fakeWriter));
			tableProcessor.endRow(0, asWriter(fakeWriter), pageBreaks);

			var nestedTableProcessor = new TableProcessor(asNode(nestedTableNode));
			nestedTableProcessor.beginTable(asWriter(fakeWriter));
			nestedTableProcessor.endRow(0, asWriter(fakeWriter), pageBreaks);
			nestedTableProcessor.endTable(asWriter(fakeWriter));
			assert.equal(fakeWriter.popFromRepeatables.mock.calls.length, 0);

			tableProcessor.endTable(asWriter(fakeWriter));
			assert.equal(fakeWriter.popFromRepeatables.mock.calls.length, 1);
		});
	});

	describe("headerRows and keepWithHeaderRows (issue #2754)", function () {
		var fakeWriter = {
			context: function () {
				return {
					availableWidth: 56473,
				};
			},
			beginUnbreakableBlock: function () {},
		} as unknown as PageElementWriter;

		const inputTable: MutableTableFixture = {
			table: {
				widths: [{ width: 20 }, { width: 20 }],
				body: [
					["a", "b"],
					["c", "d"],
					["e", "f"],
				],
			},
			_offsets: {
				total: 9,
			},
			_layout: {
				paddingLeft: function () {},
				paddingRight: function () {},
				paddingBottom: function () {},
				paddingTop: function () {},
				vLineWidth: function () {},
				hLineWidth: function () {},
				fillColor: function () {},
				fillOpacity: function () {},
			},
		};

		it("should ignore wrong values for headerRows - 1", function () {
			inputTable.table.headerRows = "2";
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () {};
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 0);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 0);
		});

		it("should ignore wrong values for headerRows - 2", function () {
			inputTable.table.headerRows = -5;
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () {};
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 0);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 0);
		});

		it("should ignore wrong values for headerRows - 3", function () {
			inputTable.table.headerRows = 2.5;
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () {};
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 0);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 0);
		});

		it("should ignore keepWithHeaderRows if headerRows is not bigger than 0", function () {
			inputTable.table.headerRows = 0;
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () {};
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 0);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 0);
		});

		it("should ignore wrong values for keepWithHeaderRows - 1", function () {
			inputTable.table.headerRows = 1;
			inputTable.table.keepWithHeaderRows = 1.5;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () {};
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 1);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 1);
		});

		it("should ignore wrong values for keepWithHeaderRows - 2", function () {
			inputTable.table.headerRows = 2;
			inputTable.table.keepWithHeaderRows = "1.5";

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () {};
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.headerRows, 2);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 2);
		});

		it("should sum up headerRows and keepWithHeaderRows - 1", function () {
			inputTable.table.headerRows = 1;
			inputTable.table.keepWithHeaderRows = 2;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () {};
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 3);
			assert.equal(tableProcessor.headerRows, 1);
		});

		it("should sum up headerRows and keepWithHeaderRows - 2", function () {
			inputTable.table.headerRows = 1;
			inputTable.table.keepWithHeaderRows = 0;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () {};
			tableProcessor.beginTable(fakeWriter);
			assert.equal(tableProcessor.rowsWithoutPageBreak, 1);
			assert.equal(tableProcessor.headerRows, 1);
		});

		it("should throw exception when headerRows > table rows", function () {
			inputTable.table.headerRows = 5;
			inputTable.table.keepWithHeaderRows = 0;

			var tableProcessor = new TableProcessor(inputTable);
			tableProcessor.drawHorizontalLine = function () {};
			assert.throws(() => tableProcessor.beginTable(fakeWriter), /Too few rows in the table/);
		});
	});
});
