import { assert, beforeEach, describe, it } from "vitest";
import type { LayoutBuilder } from "../../../../tests/helpers/layout-builder.ts";
import { createLayoutBuilder, sampleTestProvider } from "../../../../tests/helpers/layout-builder.ts";

describe("columns layout", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	it("should support columns", function () {
		var desc = [
			{
				columns: [
					{
						text: "column 1",
					},
					{
						text: "column 2",
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items[0].item.x, 40);
		assert.equal(pages[0].items[1].item.x, 200);
	});

	it("should support fixed column widths", function () {
		var desc = [
			{
				columns: [
					{
						text: "col1",
						width: 100,
					},
					{
						text: "col2",
						width: 150,
					},
					{
						text: "col3",
						width: 90,
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items.length, 3);
		assert.equal(pages[0].items[0].item.x, 40);
		assert.equal(pages[0].items[1].item.x, 40 + 100);
		assert.equal(pages[0].items[2].item.x, 40 + 100 + 150);
	});

	it("should support text-only column definitions", function () {
		var desc = [
			{
				columns: ["column 1", "column 2"],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items[0].item.x, 40);
		assert.equal(pages[0].items[1].item.x, 200);
	});

	it("column descriptor should support named style inheritance", function () {
		var desc = [
			{
				style: "header",

				columns: [
					{
						text: "column 1",
					},
					{
						text: "column 2",
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 20 } });
		assert.equal(pages[0].items.length, 2);
		assert.equal(pages[0].items[0].item.getWidth(), 8 * 20);
		assert.equal(pages[0].items[1].item.getWidth(), 8 * 20);
	});

	it("column descriptor should support style overrides", function () {
		var desc = [
			{
				fontSize: 8,

				columns: [
					{
						text: "column 1",
					},
					{
						text: "column 2",
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 20 } });
		assert.equal(pages[0].items.length, 2);
		assert.equal(pages[0].items[0].item.getWidth(), 8 * 8);
	});

	it("should support column gap", function () {
		var desc = [
			{
				fontSize: 8,
				columnGap: 23,
				columns: [
					{ text: "column 1", width: 100 },
					{ text: "column 2", width: 100 },
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 2);
		assert.equal(pages[0].items[0].item.x, 40);
		assert.equal(pages[0].items[1].item.x, 40 + 100 + 23);
	});

	it("should support column gap inheritance", function () {
		var desc = [
			{
				fontSize: 8,
				columns: [
					{ text: "column 1", width: 100 },
					{ text: "column 2", width: 100 },
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { columnGap: 25 });
		assert.equal(pages[0].items[1].item.x, 40 + 100 + 25);
	});

	it("should support fixed column widths", function () {
		var desc = [
			{
				columns: [
					{
						text: "col1",
						width: 100,
					},
					{
						text: "col2",
						width: 150,
					},
					{
						text: "col3",
						width: 90,
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items.length, 3);
		assert.equal(pages[0].items[0].item.x, 40);
		assert.equal(pages[0].items[1].item.x, 40 + 100);
		assert.equal(pages[0].items[2].item.x, 40 + 100 + 150);
	});

	it("should support auto-width columns", function () {
		var desc = [
			{
				columns: [
					{
						text: "col1",
						width: "auto",
						noWrap: true,
					},
					{
						text: "column",
						width: "auto",
						noWrap: true,
					},
					{
						text: "col3",
						width: "auto",
						noWrap: true,
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items.length, 3);
		assert.equal(pages[0].items[0].item.x, 40);
		assert.equal(pages[0].items[1].item.x, 40 + 4 * 12);
		assert.equal(pages[0].items[2].item.x, 40 + 4 * 12 + 6 * 12);
	});

	it("should support auto-width columns mixed with other types of columns", function () {
		var desc = [
			{
				columns: [
					{
						text: "col1",
						width: "auto",
						noWrap: true,
					},
					{
						text: "column",
						width: 58,
						noWrap: true,
					},
					{
						text: "column",
						width: "*",
						noWrap: true,
					},
					{
						text: "column",
						width: "*",
						noWrap: true,
					},
					{
						text: "col3",
						width: "auto",
						noWrap: true,
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items.length, 5);

		var starWidth = (400 - 40 - 40 - 58 - 2 * 4 * 12) / 2;
		assert.equal(pages[0].items[0].item.x, 40);
		assert.equal(pages[0].items[1].item.x, 40 + 4 * 12);
		assert.equal(pages[0].items[2].item.x, 40 + 4 * 12 + 58);
		assert.equal(pages[0].items[3].item.x, 40 + 4 * 12 + 58 + starWidth);
		assert.equal(pages[0].items[4].item.x, 40 + 4 * 12 + 58 + 2 * starWidth);
	});

	it("should support star columns and divide available width equally between all star columns", function () {
		var desc = [
			{
				columns: [
					{
						text: "col1",
					},
					{
						text: "col2",
						width: 50,
					},
					{
						text: "col3",
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		var pageSpace = 400 - 40 - 40;
		var starWidth = (pageSpace - 50) / 2;

		assert.equal(pages[0].items.length, 3);
		assert.equal(pages[0].items[0].item.x, 40);
		assert.equal(pages[0].items[1].item.x, 40 + starWidth);
		assert.equal(pages[0].items[2].item.x, 40 + starWidth + 50);
	});

	it("should pass column widths to inner elements", function () {
		var desc = [
			{
				fontSize: 8,

				columns: [
					{
						columns: [
							{
								text: "sample text here, should have maxWidth set to ((400 - 40 - 40 - 50)/2)/2",
							},
							{
								text: "second column",
							},
						],
					},
					{
						text: "col2",
						width: 50,
					},
					{
						text: "col3",
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		// ((pageWidth - margins - fixed_column_width) / 2_columns) / 2_subcolumns
		var maxWidth = (400 - 40 - 40 - 50) / 2 / 2;
		assert.equal(pages[0].items[0].item.maxWidth, maxWidth);
	});

	it("stack of paragraphs should inherit styles and overridden properties from column descriptors", function () {
		var desc = [
			{
				style: "header",
				italics: false,
				noWrap: true,
				columns: [
					{
						bold: true,
						stack: ["paragraph", { text: "paragraph2" }, { text: "paragraph3", bold: false }],
					},
					"another column",
					{
						text: "third column",
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider, {
			header: {
				italics: true,
				fontSize: 50,
			},
		});

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 5);
		assert.equal(pages[0].items[0].item.x, pages[0].items[1].item.x);
		assert.equal(pages[0].items[1].item.x, pages[0].items[2].item.x);

		assert.equal(pages[0].items[0].item.y, pages[0].items[3].item.y);
		assert.equal(pages[0].items[0].item.y, pages[0].items[4].item.y);

		assert.equal(pages[0].items[0].item.inlines[0].width, 9 * 50 * 1.5);
		assert.equal(pages[0].items[1].item.inlines[0].width, 10 * 50 * 1.5);

		assert.equal(pages[0].items[2].item.inlines[0].width, 10 * 50);
		assert.equal(pages[0].items[3].item.inlines[0].width, 14 * 50);
		assert.equal(pages[0].items[4].item.inlines[0].width, 12 * 50);
	});
});

