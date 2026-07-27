import { assert, describe, it } from "vitest";
import DocPreprocessor from "../doc-preprocessor.ts";
import type { PdfNode } from "../../types/internal.ts";

type PreprocessedFixture = PdfNode & {
	stack: PreprocessedFixture[];
	text: string & PreprocessedFixture[];
	toc: NonNullable<PdfNode["toc"]>;
};

describe("DocPreprocessor", function () {
	const docPreprocessor = new DocPreprocessor();

	describe("AcroForms", function () {
		it("accepts valid fields and rejects incomplete definitions", function () {
			assert.doesNotThrow(() =>
				docPreprocessor.preprocessNode({
					acroform: { type: "text", id: "customer-name" },
					width: "*",
					height: 20,
				}),
			);
			assert.throws(
				() => docPreprocessor.preprocessNode({ acroform: { type: "text", id: "" } }),
				/non-empty string/,
			);
			assert.throws(
				() => docPreprocessor.preprocessNode({ acroform: { type: "radio", id: "choice" } }),
				/unsupported field type/,
			);
		});
	});

	describe("decorated stacks", function () {
		it("normalizes a decorated stack through the rounded table container", function () {
			const result = docPreprocessor.preprocessNode({
				stack: ["Payment details", "IBAN: FR14"],
				borderRadius: 12,
				borderWidth: 2,
				borderColor: "#334155",
				backgroundColor: "#f8fafc",
				padding: [8, 10],
			});
			const layout = result.table!._bodyLayout as {
				fillColor: string;
				paddingLeft(): number;
				paddingTop(): number;
			};

			assert.equal(result.stack, undefined);
			assert.equal(result.table!.borderRadius, 12);
			assert.equal(result.table!._blockContainer, true);
			assert.equal(result.table!.body[0][0].stack![0].text, "Payment details");
			assert.equal(layout.fillColor, "#f8fafc");
			assert.equal(layout.paddingLeft(), 8);
			assert.equal(layout.paddingTop(), 10);
		});

		it("rejects invalid stack decoration dimensions", function () {
			assert.throws(
				() => docPreprocessor.preprocessNode({ stack: ["Invalid"], borderWidth: -1 }),
				/'borderWidth' must be a finite non-negative number/,
			);
			assert.throws(
				() => docPreprocessor.preprocessNode({ stack: ["Invalid"], padding: [4, -2] }),
				/'padding' must be a finite non-negative number/,
			);
		});
	});

	describe("text", function () {
		it("has been registered text node to normalizer", function () {
			var ddContent = {
				text: "text",
			};

			assert.doesNotThrow(function () {
				docPreprocessor.preprocessNode(ddContent);
			});
		});

		it("should expand shortcut to text and normalize", function () {
			var ddContent = [
				"Abc123",
				"12",
				"12.34",
				"0",
				"",
				new String("Abcdef"),
				56,
				56.78,
				0,
				true,
				false,
				"true",
				"false",
				[], // is stack
				"[]",
				[1, 2, 3], // is stack
				{},
				"{}",
				null,
				"null",
				undefined,
				"undefined",
			];
			var result = docPreprocessor.preprocessNode(ddContent) as PreprocessedFixture;

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 22);
			assert.equal(result.stack[0].text, "Abc123");
			assert.equal(result.stack[1].text, "12");
			assert.equal(result.stack[2].text, "12.34");
			assert.equal(result.stack[3].text, "0");
			assert.equal(result.stack[4].text, "");
			assert.equal(result.stack[5].text, "Abcdef");
			assert.equal(result.stack[6].text, "56");
			assert.equal(result.stack[7].text, "56.78");
			assert.equal(result.stack[8].text, "0");
			assert.equal(result.stack[9].text, "true");
			assert.equal(result.stack[10].text, "false");
			assert.equal(result.stack[11].text, "true");
			assert.equal(result.stack[12].text, "false");
			assert.equal(Array.isArray(result.stack[13].stack), true);
			assert.equal(result.stack[13].stack.length, 0);
			assert.equal(result.stack[14].text, "[]");
			assert.equal(Array.isArray(result.stack[15].stack), true);
			assert.equal(result.stack[15].stack.length, 3);
			assert.equal(result.stack[15].stack[0].text, "1");
			assert.equal(result.stack[15].stack[1].text, "2");
			assert.equal(result.stack[15].stack[2].text, "3");
			assert.equal(result.stack[16].text, "");
			assert.equal(result.stack[17].text, "{}");
			assert.equal(result.stack[18].text, "");
			assert.equal(result.stack[19].text, "null");
			assert.equal(result.stack[20].text, "");
			assert.equal(result.stack[21].text, "undefined");
		});

		it("should normalize text", function () {
			var ddContent = [
				{ text: "Abc123" },
				{ text: "12" },
				{ text: "12.34" },
				{ text: "0" },
				{ text: "" },
				{ text: new String("Abcdef") },
				{ text: 56 },
				{ text: 56.78 },
				{ text: 0 },
				{ text: true },
				{ text: false },
				{ text: "true" },
				{ text: "false" },
				{ text: [] }, // is text with nested texts
				{ text: "[]" },
				{ text: [1, 2, 3] }, // is text with nested texts
				{ text: {} },
				{ text: "{}" },
				{ text: null },
				{ text: "null" },
				{ text: undefined },
				{ text: "undefined" },
			];
			var result = docPreprocessor.preprocessNode(ddContent) as PreprocessedFixture;

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 22);
			assert.equal(result.stack[0].text, "Abc123");
			assert.equal(result.stack[1].text, "12");
			assert.equal(result.stack[2].text, "12.34");
			assert.equal(result.stack[3].text, "0");
			assert.equal(result.stack[4].text, "");
			assert.equal(result.stack[5].text, "Abcdef");
			assert.equal(result.stack[6].text, "56");
			assert.equal(result.stack[7].text, "56.78");
			assert.equal(result.stack[8].text, "0");
			assert.equal(result.stack[9].text, "true");
			assert.equal(result.stack[10].text, "false");
			assert.equal(result.stack[11].text, "true");
			assert.equal(result.stack[12].text, "false");
			assert.equal(Array.isArray(result.stack[13].text), true);
			assert.equal(result.stack[13].text.length, 0);
			assert.equal(result.stack[14].text, "[]");
			assert.equal(Array.isArray(result.stack[15].text), true);
			assert.equal(result.stack[15].text.length, 3);
			assert.equal(result.stack[15].text[0].text, "1");
			assert.equal(result.stack[15].text[1].text, "2");
			assert.equal(result.stack[15].text[2].text, "3");
			assert.equal(result.stack[16].text, "");
			assert.equal(result.stack[17].text, "{}");
			assert.equal(result.stack[18].text, "");
			assert.equal(result.stack[19].text, "null");
			assert.equal(result.stack[20].text, "");
			assert.equal(result.stack[21].text, "undefined");
		});

		it("should replace tab as 4 spaces", function () {
			var ddContent = [
				"a\tb",
				{ text: "a\tb" },
				"a\tb\tc",
				{ text: "a\tb\tc" },
				{
					text: ["A\tB", { text: "A\tB" }],
				},
			];
			var result = docPreprocessor.preprocessNode(ddContent) as PreprocessedFixture;

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 5);
			assert.equal(result.stack[0].text, "a    b");
			assert.equal(result.stack[1].text, "a    b");
			assert.equal(result.stack[2].text, "a    b    c");
			assert.equal(result.stack[3].text, "a    b    c");
			assert.equal(result.stack[4].text[0].text, "A    B");
			assert.equal(result.stack[4].text[1].text, "A    B");
		});

		it("should support text in nested nodes", function () {
			var ddContent = [
				{
					text: {
						text: {
							text: "hello world",
						},
					},
				},
			];
			var result = docPreprocessor.preprocessNode(ddContent) as PreprocessedFixture;

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 1);
			assert.equal(Array.isArray(result.stack[0].text), true);
			assert.equal(result.stack[0].text.length, 1);
			assert.equal(Array.isArray(result.stack[0].text[0].text), true);
			assert.equal(result.stack[0].text[0].text.length, 1);
			assert.equal(result.stack[0].text[0].text[0].text, "hello world");
		});

		it("should report an invalid text value at preprocessing time", function () {
			assert.throws(
				() => docPreprocessor.preprocessNode({ text: { value: "not text" } }),
				/Invalid text value: expected a string, number, boolean, array or nested text node/,
			);
		});

		it("should report unsupported document values with their structure", function () {
			assert.throws(
				() => docPreprocessor.preprocessNode(Symbol("unsupported")),
				/Unrecognized document structure: Symbol\(unsupported\)/,
			);
		});

		it("should identify invalid container and table structures", function () {
			assert.throws(
				() => docPreprocessor.preprocessNode({ stack: "not-an-array" }),
				/Invalid stack node: 'stack' must be an array/,
			);
			assert.throws(
				() => docPreprocessor.preprocessNode({ table: { body: { groups: [{ rows: [] }] } } }),
				/Invalid table node: 'table\.body\.groups\[0\]\.rows' must contain at least one row/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { body: { groups: [{ rows: [[{ text: "Invalid", colSpan: "2" }]] }] } },
					}),
				/Invalid table cell at row 0, column 0: 'colSpan' must be a positive integer, received "2"/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { body: { groups: [{ rows: [[{ text: "Invalid", rowSpan: 0 }]] }] } },
					}),
				/Invalid table cell at row 0, column 0: 'rowSpan' must be a positive integer, received 0/,
			);
		});

		it("rejects table geometry that cannot produce a rectangular layout grid", function () {
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { widths: [], body: { groups: [{ rows: [["Cell"]] }] } },
					}),
				/'table\.widths' must not be an empty array/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { widths: ["auto", {}], body: { groups: [{ rows: [["A", "B"]] }] } },
					}),
				/'table\.widths\[1\]' must be/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { heights: -1, body: { groups: [{ rows: [["Cell"]] }] } },
					}),
				/'table\.heights' must contain only/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { body: { groups: [{ rows: [[]] }] } },
					}),
				/table rows must contain at least one cell/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { body: { groups: [{ rows: [["A", "B"], ["A"]] }] } },
					}),
				/row 1: resolves to fewer than 2 columns/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: {
							body: {
								groups: [
									{
										rows: [
											["A", "B"],
											["A", "B", "C"],
										],
									},
								],
							},
						},
					}),
				/row 1: resolves to more than 2 columns/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: {
							body: { groups: [{ rows: [["A", "B"], [{ text: "Invalid", colSpan: 3 }]] }] },
						},
					}),
				/'colSpan' exceeds the table's 2 columns/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: {
							body: { groups: [{ rows: [[{ text: "Invalid", rowSpan: 2 }]] }] },
						},
					}),
				/'rowSpan' exceeds the table's 1 rows/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: {
							body: {
								groups: [
									{
										rows: [
											["A", { text: "B", rowSpan: 2 }, "C"],
											[{ text: "Invalid", colSpan: 2 }, "D"],
										],
									},
								],
							},
						},
					}),
				/'colSpan' overlaps an active rowSpan/,
			);
		});

		it("normalizes headers and logical row groups for table layout", function () {
			const headerLayout = { fillColor: "#e0e3fd" };
			const bodyLayout = { vLineWidth: () => 0 };
			const result = docPreprocessor.preprocessNode({
				table: {
					borderRadius: 8,
					header: { rows: [["Header A", "Header B"]], layout: headerLayout },
					body: {
						layout: bodyLayout,
						groups: [
							{
								keepTogether: true,
								dontBreakRows: true,
								rows: [["Product", "2"], [{ text: "Description", colSpan: 2 }]],
							},
						],
					},
				},
			});

			assert.equal(result.table!.headerRows, 1);
			assert.equal(result.table!.borderRadius, 8);
			assert.equal(result.table!.body.length, 3);
			assert.equal(result.table!._headerLayout, headerLayout);
			assert.equal(result.table!._bodyLayout, bodyLayout);
			assert.deepEqual(result.table!._rowGroups, [
				{ startRow: 1, endRow: 2, keepTogether: true, dontBreakRows: true },
			]);
			assert.equal(result.table!.body[2].length, 2);
			assert.equal("_span" in result.table!.body[2][1] && result.table!.body[2][1]._span, true);
		});

		it("rejects the replaced flat table API with migration guidance", function () {
			assert.throws(
				() => docPreprocessor.preprocessNode({ table: { body: [["Legacy row"]] } }),
				/table\.body.*object with a 'groups' array/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { headerRows: 1, body: { groups: [{ rows: [["Legacy header"]] }] } },
					}),
				/'headerRows' is no longer supported/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { body: { groups: [{ rows: [["Legacy layout"]] }] } },
						layout: "noBorders",
					}),
				/node-level 'layout' is no longer supported/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: {
							header: { rows: [["Header"]], layout: 42 },
							body: { groups: [] },
						},
					}),
				/'table\.header\.layout' must be a layout name or object/,
			);
			assert.throws(
				() =>
					docPreprocessor.preprocessNode({
						table: { borderRadius: -1, body: { groups: [{ rows: [["Invalid radius"]] }] } },
					}),
				/'table\.borderRadius' must be a finite non-negative number/,
			);
		});

		it("expands compact colspan rows without overwriting following cells (#1814)", function () {
			const node = {
				table: {
					body: {
						groups: [
							{
								rows: [
									["Qty", "Description", "Units", "Price", "Total"],
									[
										{ text: "Sum", colSpan: 4 },
										{ text: "2.85", alignment: "right" },
									],
								],
							},
						],
					},
				},
			};

			const result = docPreprocessor.preprocessNode(node);
			const row = result.table!.body[1];

			assert.equal(row.length, 5);
			assert.equal("_span" in row[1] && row[1]._span, true);
			assert.equal("_span" in row[2] && row[2]._span, true);
			assert.equal("_span" in row[3] && row[3]._span, true);
			assert.equal(row[4].text, "2.85");
		});

		it("inserts compact row-span placeholders without overwriting following rows (#1814)", function () {
			const result = docPreprocessor.preprocessNode({
				table: {
					body: {
						groups: [
							{
								rows: [
									["A", "B", "C", "D"],
									[{ text: "1", rowSpan: 2 }, { text: "2", colSpan: 2 }, { text: "3" }],
									[{ text: "4", colSpan: 3 }],
								],
							},
						],
					},
				},
			});
			const row = result.table!.body[2];

			assert.equal(row.length, 4);
			assert.equal("_span" in row[0] && row[0]._span, true);
			assert.equal(row[1].text, "4");
			assert.equal("_span" in row[2] && row[2]._span, true);
			assert.equal("_span" in row[3] && row[3]._span, true);
		});
	});

	describe("toc", function () {
		it("should support simple toc on begin of document", function () {
			var ddContent = [
				{
					toc: {},
				},
				{
					text: "Header 1",
					tocItem: true,
				},
				{
					text: "Header 2",
					tocItem: true,
				},
			];
			var result = docPreprocessor.preprocessDocument(ddContent) as PreprocessedFixture;

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 3);
			assert.equal(result.stack[0].toc.id, "_default_");
			assert.equal(Array.isArray(result.stack[0].toc._items), true);
			assert.equal(result.stack[0].toc._items.length, 2);
			assert.equal(result.stack[1].id, "toc-_default_-0");
			assert.equal(result.stack[2].id, "toc-_default_-1");
		});

		it("should support simple toc on end of document", function () {
			var ddContent = [
				{
					text: "Header 1",
					tocItem: true,
				},
				{
					text: "Header 2",
					tocItem: true,
				},
				{
					toc: {},
				},
			];
			var result = docPreprocessor.preprocessDocument(ddContent) as PreprocessedFixture;

			assert.equal(Array.isArray(result.stack), true);
			assert.equal(result.stack.length, 3);
			assert.equal(result.stack[0].id, "toc-_default_-0");
			assert.equal(result.stack[1].id, "toc-_default_-1");
			assert.equal(result.stack[2].toc.id, "_default_");
			assert.equal(Array.isArray(result.stack[2].toc._items), true);
			assert.equal(result.stack[2].toc._items.length, 2);
		});
	});

	describe("section", function () {
		it("should support section", function () {
			var ddContent = [
				{
					section: [],
				},
				{
					section: [],
				},
			];
			assert.doesNotThrow(function () {
				docPreprocessor.preprocessDocument(ddContent);
			});
		});

		it("should support section in stack", function () {
			var ddContent = [
				{
					stack: [
						{
							section: [],
						},
						{
							section: [],
						},
					],
				},
			];
			assert.doesNotThrow(function () {
				docPreprocessor.preprocessDocument(ddContent);
			});
		});

		it("should support section only in root", function () {
			var ddContent = [
				{
					table: {
						body: { groups: [{ rows: [[{ section: [] }]] }] },
					},
				},
			];

			assert.throws(
				() => docPreprocessor.preprocessDocument(ddContent),
				/Incorrect document structure, section node is only allowed at the root level of document structure/,
			);
		});
	});
});
