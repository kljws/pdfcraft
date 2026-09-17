import { assert, beforeEach, describe, it } from "vitest";
import type { LayoutBuilder } from "../../../../tests/helpers/layout-builder.ts";
import { createLayoutBuilder, sampleTestProvider } from "../../../../tests/helpers/layout-builder.ts";

describe("list layout", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	it("should support unordered lists", function () {
		var desc = [
			"paragraph",
			{
				ul: ["item 1", "item 2", "item 3"],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 7);
	});

	it("unordered lists should have circles to the left of each element", function () {
		var desc = [
			"paragraph",
			{
				ul: ["item 1", "item 2", "item 3"],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 7);

		for (var i = 1; i < 7; i += 2) {
			var circle = pages[0].items[i + 1].item; // circle is added after line
			var itemLine = pages[0].items[i].item;

			assert(circle.x < itemLine.x);
			assert(circle.y > itemLine.y && circle.y < itemLine.y + itemLine.getHeight());
		}
	});

	it("circle radius for unordered lists should be based on fontSize", function () {
		var desc = [
			{
				fontSize: 10,
				ul: ["item 1", "item 2", "item 3"],
			},
			{
				fontSize: 18,
				ul: ["item 1", "item 2", "item 3"],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		// without Math.toFixed an AssertionError occurs: 1.7999999999999998 == 1.8
		assert.equal(
			(pages[0].items[7].item.r1 / pages[0].items[1].item.r1).toFixed(1),
			(18 / 10).toFixed(1),
		);
	});

	it("unordered lists should support nested lists", function () {
		var desc = [
			{
				fontSize: 10,
				ul: [
					"item 1",
					{
						ul: ["subitem 1", "subitem 2", "subitem 3"],
					},
					"item 3",
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items.length, 10);

		// positioning
		assert.equal(pages[0].items[0].item.x, pages[0].items[8].item.x);
		assert.equal(pages[0].items[2].item.x, pages[0].items[4].item.x);
		assert(pages[0].items[0].item.x < pages[0].items[2].item.x);

		// circle positioning
		var circle = pages[0].items[3].item;
		var itemLine = pages[0].items[2].item;
		assert(circle.x < itemLine.x);
		assert(circle.y > itemLine.y && circle.y < itemLine.y + itemLine.getHeight());
	});

	it("if there is enough space left on the page for the circle but not enough for the following line of text, circle should be drawn on the next page, together with the text", function () {
		var desc = [
			{
				fontSize: 72,
				stack: [
					"paragraph",
					"paragraph",
					"paragraph",
					"paragraph",
					"paragraph",
					"paragraph",
					"paragraph",
					"paragraph",
					"paragraph",
				],
				noWrap: true,
			},
			{
				fontSize: 90,
				ul: [
					{
						text: [{ text: "line ", noWrap: true }, { text: "1" }],
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 2);
		assert.equal(pages[0].items.length, 9);
		assert.equal(pages[1].items.length, 3);
	});

	it("should support ordered lists", function () {
		var desc = [
			"paragraph",
			{
				ol: ["item 1", "item 2", "item 3"],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 4 + 3);
	});

	it("numbers in ordered list should use list style, not item-level style (bugfix)", function () {
		var desc = [
			{
				fontSize: 5,
				ol: [{ text: "item 1", fontSize: 15 }],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items.length, 2);
		assert.equal(pages[0].items[0].item.inlines[0].fontSize, 15);
		assert.equal(pages[0].items[1].item.inlines[0].fontSize, 5);
	});

	it("numbers in ordered lists should be positioned to the left of each item", function () {
		var desc = [
			"paragraph",
			{
				ol: ["item 1", "item 2", "item 3"],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 4 + 3);

		for (var i = 0; i < 3; i++) {
			var itemLine = pages[0].items[1 + 2 * i].item;
			var numberLine = pages[0].items[2 + 2 * i].item;

			assert(numberLine.x < itemLine.x);
			assert(numberLine.x + numberLine.getWidth() <= itemLine.x);
			assert(numberLine.y >= itemLine.y && numberLine.y <= itemLine.y + itemLine.getHeight());
		}
	});

	it("numbers in ordered lists should be positioned to the left of each item also in more complex cases", function () {
		var desc = [
			"paragraph",
			{
				ol: [
					"item 1",
					{ fontSize: 40, text: "item 2" },
					{ text: ["item 3", { text: "next inline", fontSize: 30 }] },
					"item 4\nhaving two lines",
					{ text: ["item 5", { text: "next inline\nand next line", fontSize: 30 }] },
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);

		for (var i = 0; i < 3; i++) {
			var paragraphLine = pages[0].items[1 + 2 * i].item;
			var numberLine = pages[0].items[2 + 2 * i].item;

			assert(numberLine.x < paragraphLine.x);
			assert(numberLine.x + numberLine.getWidth() <= paragraphLine.x);
		}
	});

	it("numbers in ordered lists should be aligned (vertically) to the bottom of the first line of each item", function () {
		var desc = [
			"paragraph",
			{
				ol: [
					"item 1",
					{ fontSize: 40, text: "item 2" },
					{ text: ["item 3", { text: "next inline", fontSize: 30 }] },
					"item 4\nhaving two lines",
					{ text: ["item 5", { text: "next inline\nand next line", fontSize: 30 }] },
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);

		for (var i = 0; i < 3; i++) {
			var paragraphLine = pages[0].items[1 + 2 * i].item;
			var numberLine = pages[0].items[2 + 2 * i].item;

			assert.equal(
				numberLine.y + numberLine.getAscenderHeight(),
				paragraphLine.y + paragraphLine.getAscenderHeight(),
			);
		}
	});

	it("numbers in ordered list should be automatically incremented", function () {
		var desc = [
			{
				ol: ["item", "item", "item", "item"],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		for (var i = 0; i < 4; i++) {
			var numberLine = pages[0].items[1 + 2 * i].item;

			assert.equal(numberLine.inlines[0].text, (i + 1).toString() + ". ");
		}
	});

	it("numbers in ordered sublist should have independent counters", function () {
		var desc = [
			{
				ol: [
					"item 1",
					"item 2",
					{
						ol: ["subitem 1", "subitem 2", "subitem 3"],
					},
					"item 3",
					"item 4",
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		// item 2
		assert.equal(pages[0].items[3].item.inlines[0].text, "2. ");
		// item 3
		assert.equal(pages[0].items[3 + 6].item.inlines[0].text, "3. ");

		// subitem 1
		assert.equal(pages[0].items[5].item.inlines[0].text, "1. ");
		// subitem 2
		assert.equal(pages[0].items[7].item.inlines[0].text, "2. ");
	});

	it("ordered lists should not add an empty line below the number (bugfix)", function () {
		var desc = [
			{
				ol: ["item 1", "item 2"],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages[0].items[0].item.y, 40);
		assert.equal(pages[0].items[1].item.y, 40);
		assert.equal(pages[0].items[2].item.y, 40 + 12);
	});
});

