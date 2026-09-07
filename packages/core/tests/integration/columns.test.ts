import { assert, describe, it } from "vitest";
import sizes from "../../src/configuration/page-size.constants.ts";

import IntegrationTestHelper from "./integration-test.helpers.ts";

describe("Integration test: columns", function () {
	var testHelper = new IntegrationTestHelper();

	it("renders two columns", function () {
		var dd = {
			content: [
				{
					alignment: "justify",
					columns: [
						"Lorem ipsum Malit profecta versatur",
						"and alta adipisicing elit Malit profecta versatur",
					],
				},
			],
			defaultStyle: {
				columnGap: 1,
			},
		};
		var pages = testHelper.renderPages("A5", dd);

		var columnCount = 2,
			columnSpacing = (sizes.A5[0] + dd.defaultStyle.columnGap) / columnCount;

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 4);
		assert.deepEqual(
			pages[0].items.map((node) => node.item).map((item) => item.x),
			[testHelper.MARGINS.left, testHelper.MARGINS.left, columnSpacing, columnSpacing],
		);
		assert.deepEqual(
			pages[0].items.map((node) => node.item).map((item) => item.y),
			[
				testHelper.MARGINS.top,
				testHelper.MARGINS.top + testHelper.LINE_HEIGHT,
				testHelper.MARGINS.top,
				testHelper.MARGINS.top + testHelper.LINE_HEIGHT,
			],
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 0 }).join(""),
			"Lorem ipsum Malit profecta ",
		);
		assert.deepEqual(testHelper.getInlineTexts(pages, { page: 0, item: 1 }).join(""), "versatur");
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 2 }).join(""),
			"and alta adipisicing elit Malit ",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 3 }).join(""),
			"profecta versatur",
		);
	});

	it("renders three columns", function () {
		var dd = {
			content: [
				{
					columns: ["dolor sit amet", "Diu concederetur.", "dolor sit amet"],
				},
			],
			defaultStyle: {
				columnGap: 1,
			},
		};

		var pages = testHelper.renderPages("A5", dd);

		var columnCount = 3,
			columnSpacing =
				(sizes.A5[0] -
					(testHelper.MARGINS.left + testHelper.MARGINS.right) +
					dd.defaultStyle.columnGap) /
				columnCount;

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 3);
		assert.deepEqual(
			pages[0].items.map((node) => node.item).map((item) => item.x),
			[
				testHelper.MARGINS.left,
				testHelper.MARGINS.left + columnSpacing,
				testHelper.MARGINS.left + 2 * columnSpacing,
			],
		);
		assert.deepEqual(
			pages[0].items.map((node) => node.item).map((item) => item.y),
			[testHelper.MARGINS.top, testHelper.MARGINS.top, testHelper.MARGINS.top],
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 0 }).join(""),
			"dolor sit amet",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 1 }).join(""),
			"Diu concederetur.",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 2 }).join(""),
			"dolor sit amet",
		);
	});

	it("renders star column", function () {
		var dd = {
			content: [
				{
					columns: [
						{
							width: 90,
							text: "Lorem ipsum dolor sit amet, consectetur adipisicing elit.",
						},
						{
							width: "*",
							text: "Lorem ipsum dolor sit amet, consectetur adipisicing elit.",
						},
					],
				},
			],
			defaultStyle: {
				columnGap: 1,
			},
		};

		var pages = testHelper.renderPages("A5", dd);

		var leftColumnSpacing = testHelper.MARGINS.left,
			definedWidth = Number(dd.content[0].columns[0].width),
			rightColumnSpacing = testHelper.MARGINS.left + definedWidth + dd.defaultStyle.columnGap,
			starWidth =
				sizes.A5[0] -
				(testHelper.MARGINS.left + testHelper.MARGINS.right) -
				dd.defaultStyle.columnGap -
				definedWidth;

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 6);
		var items = pages[0].items.map((node) => node.item);
		assert.deepEqual(
			items.map((item) => item.x),
			[
				leftColumnSpacing,
				leftColumnSpacing,
				leftColumnSpacing,
				leftColumnSpacing,
				rightColumnSpacing,
				rightColumnSpacing,
			],
		);
		assert.deepEqual(
			items.map((item) => item.y),
			[
				testHelper.MARGINS.top,
				testHelper.MARGINS.top + testHelper.LINE_HEIGHT,
				testHelper.MARGINS.top + 2 * testHelper.LINE_HEIGHT,
				testHelper.MARGINS.top + 3 * testHelper.LINE_HEIGHT,
				testHelper.MARGINS.top,
				testHelper.MARGINS.top + testHelper.LINE_HEIGHT,
			],
		);
		assert.deepEqual(
			items.map((item) => item.maxWidth),
			[definedWidth, definedWidth, definedWidth, definedWidth, starWidth, starWidth],
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 0 }).join(""),
			"Lorem ipsum ",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 1 }).join(""),
			"dolor sit amet, ",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 2 }).join(""),
			"consectetur ",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 3 }).join(""),
			"adipisicing elit.",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 4 }).join(""),
			"Lorem ipsum dolor sit amet, consectetur ",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 5 }).join(""),
			"adipisicing elit.",
		);
	});

	it("renders auto column", function () {
		var dd = {
			content: [
				{
					columns: [
						{
							width: "auto",
							text: "auto column",
						},
						{
							width: "*",
							text: "This is a star-sized column. It should get the remaining space divided by the number",
						},
						{
							width: 50,
							text: "this one",
						},
					],
				},
			],
			defaultStyle: {
				columnGap: 1,
			},
		};

		var pages = testHelper.renderPages("A5", dd);
		var items = pages[0].items.map((node) => node.item);

		var definedWidth = Number(dd.content[0].columns[2].width),
			autoColumnSpacing = testHelper.MARGINS.left,
			fixedColumnSpacing = sizes.A5[0] - testHelper.MARGINS.right - definedWidth,
			starColumnSpacing = items[1].x;

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 5);
		assert.equal(items[0].x, autoColumnSpacing);
		assert.ok(starColumnSpacing > autoColumnSpacing);
		assert.deepEqual(
			items.slice(1, -1).map((item) => item.x),
			[starColumnSpacing, starColumnSpacing, starColumnSpacing],
		);
		assert.equal(items.at(-1)?.x, fixedColumnSpacing);
		assert.deepEqual(
			items.map((item) => item.y),
			[
				testHelper.MARGINS.top,
				testHelper.MARGINS.top,
				testHelper.MARGINS.top + testHelper.LINE_HEIGHT,
				testHelper.MARGINS.top + 2 * testHelper.LINE_HEIGHT,
				testHelper.MARGINS.top,
			],
		);
		assert.equal(items[1].maxWidth, items[2].maxWidth);
		assert.equal(items[2].maxWidth, items[3].maxWidth);
		assert.equal(items[4].maxWidth, definedWidth);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 0 }).join(""),
			"auto column",
		);
		assert.deepEqual(
			items
				.slice(1, 4)
				.flatMap((item) => item.inlines.map((inline) => inline.text))
				.join(""),
			"This is a star-sized column. It should get the remaining space divided by the number",
		);
		assert.deepEqual(testHelper.getInlineTexts(pages, { page: 0, item: 4 }).join(""), "this one");
	});

	it("renders only needed space for auto columns", function () {
		var dd = {
			content: [
				{
					columns: [
						{
							width: "auto",
							text: "val",
						},
						{
							width: "auto",
							text: "val",
						},
					],
				},
			],
			defaultStyle: {
				columnGap: 1,
			},
		};

		var pages = testHelper.renderPages("A5", dd);
		var items = pages[0].items.map((node) => node.item);

		var autoWidth = Math.max(...items.slice(0, 2).map((node) => node.maxWidth)),
			leftColumnSpacing = testHelper.MARGINS.left,
			rightColumnSpacing = leftColumnSpacing + autoWidth + dd.defaultStyle.columnGap;

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 2);
		assert.deepEqual(
			items.map((item) => item.x),
			[leftColumnSpacing, rightColumnSpacing],
		);
		assert.deepEqual(
			items.map((item) => item.y),
			[testHelper.MARGINS.top, testHelper.MARGINS.top],
		);

		assert.deepEqual(testHelper.getInlineTexts(pages, { page: 0, item: 0 }).join(""), "val");
		assert.deepEqual(testHelper.getInlineTexts(pages, { page: 0, item: 1 }).join(""), "val");
	});

	it("renders empty column lists", function () {
		var dd = {
			content: [
				{ columns: [] },
				{
					columns: [{ text: new Array(80).fill(null).map(() => "Lorem ipsum") }],
				},
			],
		};
		var pages = testHelper.renderPages("A6", dd);

		assert.deepEqual(pages.length, 2);
	});

	it("render nested columns", function () {
		var dd = {
			content: [
				{
					columns: [
						{
							width: 100,
							text: "Lorem ipsum dolor sit amet",
						},
						{
							columns: ["Lorem ipsum", "Lorem ipsum", "Lorem ipsum"],
						},
					],
				},
			],
			defaultStyle: {
				columnGap: 1,
			},
		};

		var pages = testHelper.renderPages("A5", dd);
		var items = pages[0].items.map((node) => node.item);

		var gap = dd.defaultStyle.columnGap;
		var loremIpsumWidth = Math.max(
				...items.slice(items.length - 3, items.length).map((node) => node.maxWidth),
			),
			definedWidth = Number(dd.content[0].columns[0].width),
			leftColumnSpacing = testHelper.MARGINS.left,
			rightColumnSpacing = leftColumnSpacing + definedWidth + gap;

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 5);
		assert.deepEqual(
			items.map((item) => item.x),
			[
				leftColumnSpacing,
				leftColumnSpacing,
				rightColumnSpacing,
				rightColumnSpacing + (gap + loremIpsumWidth),
				rightColumnSpacing + 2 * (gap + loremIpsumWidth),
			],
		);
		assert.deepEqual(
			items.map((item) => item.y),
			[
				testHelper.MARGINS.top,
				testHelper.MARGINS.top + testHelper.LINE_HEIGHT,
				testHelper.MARGINS.top,
				testHelper.MARGINS.top,
				testHelper.MARGINS.top,
			],
		);

		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 0 }).join(""),
			"Lorem ipsum ",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 1 }).join(""),
			"dolor sit amet",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 2 }).join(""),
			"Lorem ipsum",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 3 }).join(""),
			"Lorem ipsum",
		);
		assert.deepEqual(
			testHelper.getInlineTexts(pages, { page: 0, item: 4 }).join(""),
			"Lorem ipsum",
		);
	});
});
