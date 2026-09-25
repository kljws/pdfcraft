import { assert, beforeEach, describe, it } from "vitest";
import type { LayoutBuilder } from "../../../../tests/helpers/layout-builder.ts";
import {
	createLayoutBuilder,
	sampleTestProvider,
} from "../../../../tests/helpers/layout-builder.ts";

describe("text layout", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	it("should arrange texts one below another", function () {
		var desc = ["first paragraph", "another paragraph"];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 1);
		assert(pages[0].items[0].item.y < pages[0].items[1].item.y);
		assert.equal(
			pages[0].items[0].item.y + pages[0].items[0].item.getHeight(),
			pages[0].items[1].item.y,
		);
	});

	it("should support text in nested object", function () {
		var desc = [
			{
				text: {
					text: {
						text: "hello, world",
					},
				},
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 1);
		assert.equal(pages[0].items[0].item.inlines.length, 2);
		assert.equal(pages[0].items[0].item.inlines[0].text, "hello, ");
		assert.equal(pages[0].items[0].item.inlines[1].text, "world");
	});

	it("should split lines with new-line character (bugfix)", function () {
		var desc = ["first paragraph\nhaving two lines", "another paragraph"];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 3);
	});

	it("should span text into lines if theres not enough horizontal space", function () {
		var desc = [
			"first paragraph",
			"another paragraph, this time a little bit longer though, we want to force this line to be broken into several lines",
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 6);
	});

	it("should respect maxHeight", function () {
		var desc = [
			{
				text: "another paragraph, this time a little bit longer though, we want to force this line to be broken into several lines",
				maxHeight: 15,
			},
		];
		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 1);
	});

	it("should support named styles", function () {
		var desc = [
			"paragraph",
			{
				text: "paragraph",
				style: "header",
				noWrap: true,
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

		assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
		assert.equal(pages[0].items[1].item.getWidth(), 9 * 70);
	});

	it("should support arrays of inlines (as an alternative to simple strings)", function () {
		var desc = [
			"paragraph",
			{
				text: ["paragraph ", "nextInline"],
				style: "header",
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 15 } });

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 2);
	});

	it("should support inline text in nested arrays", function () {
		var desc = [
			{
				text: [{ text: "a better " }, { text: [{ text: "style " }] }, { text: "independently " }],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { fontSize: 8 });

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 1);
		assert.equal(pages[0].items[0].item.inlines.length, 4);
		assert.equal(pages[0].items[0].item.inlines[0].text, "a ");
		assert.equal(pages[0].items[0].item.inlines[1].text, "better ");
		assert.equal(pages[0].items[0].item.inlines[2].text, "style ");
		assert.equal(pages[0].items[0].item.inlines[3].text, "independently ");
	});

	it("should support inline styling and style overrides", function () {
		var desc = [
			"paragraph",
			{
				text: [
					{ text: "paragraph", noWrap: true },
					{
						text: " paragraph",
						fontSize: 4,
					},
				],
				style: "header",
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

		assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
		assert.equal(pages[0].items[1].item.getWidth(), 9 * 70);
		assert.equal(pages[0].items[2].item.getWidth(), 9 * 4);
	});

	it("should support multiple styles (last property wins)", function () {
		var desc = ["paragraph", { text: "paragraph", style: ["header", "small"] }];

		var pages = builder.layoutDocument(desc, sampleTestProvider, {
			header: { fontSize: 70 },
			small: { fontSize: 35 },
		});

		assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
		assert.equal(pages[0].items[1].item.getWidth(), 9 * 35);
	});

	it("should support style-overrides", function () {
		var desc = ["paragraph", { text: "paragraph", fontSize: 40, noWrap: true }];

		var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

		assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
		assert.equal(pages[0].items[1].item.getWidth(), 9 * 40);
	});

	it("style-overrides should take precedence over named styles", function () {
		var desc = ["paragraph", { text: "paragraph", fontSize: 40, style: "header", noWrap: true }];

		var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

		assert.equal(pages[0].items[1].item.getWidth(), 9 * 40);
	});

	it("should support default style", function () {
		var desc = ["text", "text2"];

		var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { fontSize: 50 });
		assert.equal(pages[0].items[0].item.getWidth(), 4 * 50);
	});

	it("should use the absolutePosition attribute to position in absolute coordinates", function () {
		var desc = [
			{
				columns: [
					{
						text: "text 1",
						absolutePosition: { x: 123, y: 200 },
					},
					{
						text: "text 2",
						absolutePosition: { x: 0, y: 0 },
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items[0].item.x, 123);
		assert.equal(pages[0].items[0].item.y, 200);
		assert.equal(pages[0].items[1].item.x, 0);
		assert.equal(pages[0].items[1].item.y, 0);
	});

	it("should use the relativePosition attribute to position in relativePosition coordinates", function () {
		var desc = [
			{
				text: "text 1",
				relativePosition: { x: 123, y: 200 },
			},
			{
				text: "text 2",
				relativePosition: { x: 0, y: 0 },
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages[0].items[0].item.x, 163);
		assert.equal(pages[0].items[0].item.y, 240);
		assert.equal(pages[0].items[1].item.x, 40);
		assert.equal(pages[0].items[1].item.y, 40);
	});

	it("should support wrap long word", function () {
		var desc = ["abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items.length, 3);
	});

	it("should support wrap long word with big font size", function () {
		var desc = [
			{
				text: "abc",
				fontSize: 200,
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 3);
	});

	it("should support wrap one big character with big font size", function () {
		var desc = [
			{
				text: "a",
				fontSize: 200,
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 1);
	});

	it("should support disable wrap long word by noWrap", function () {
		var desc = [
			{ text: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", noWrap: true },
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages[0].items.length, 1);
	});

	it("should support not line break if is text inlines (#975)", function () {
		var TEXT = [
			{ text: "Celestial Circle—" },
			{ text: "The Faithful Ally", style: "styled" },
			{ text: ", " },
			{ text: "Gift of Knowledge", style: "styled" },
			{ text: ", " },
			{ text: "Servant of Infallible Locations", style: "styled" },
			{ text: ", " },
			{ text: "Swift Spirit of Winged Transportation", style: "styled" },
			{ text: ", " },
			{ text: "Warding the Created Mind", style: "styled" },
		];

		var TEXT2 = [
			{ text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod " },
			{ text: "re" },
			{ text: "mark", style: "styled" },
			{ text: "able" },
		];

		var desc = [{ text: TEXT }, { text: TEXT2 }];

		var pages = builder.layoutDocument(
			desc,
			sampleTestProvider,
			{ styled: { color: "dodgerblue" } },
			{ fontSize: 16 },
		);
		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 16);
		assert.equal(pages[0].items[5].item.inlines.length, 3);
		assert.equal(pages[0].items[5].item.inlines[0].text, "Locations");
		assert.equal(pages[0].items[5].item.inlines[1].text, ", ");
		assert.equal(pages[0].items[5].item.inlines[2].text, "Swift ");

		assert.equal(pages[0].items[15].item.inlines.length, 3);
		assert.equal(pages[0].items[15].item.inlines[0].text, "re");
		assert.equal(pages[0].items[15].item.inlines[1].text, "mark");
		assert.equal(pages[0].items[15].item.inlines[2].text, "able");
	});

	it("should support line break if is text inlines and is new line", function () {
		var desc = [{ text: "First line.\n" }, { text: "Second line." }];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 2);
		assert.equal(pages[0].items[0].item.inlines.length, 2);
		assert.equal(pages[0].items[0].item.inlines[0].text, "First ");
		assert.equal(pages[0].items[0].item.inlines[1].text, "line.");

		assert.equal(pages[0].items[1].item.inlines.length, 2);
		assert.equal(pages[0].items[1].item.inlines[0].text, "Second ");
		assert.equal(pages[0].items[1].item.inlines[1].text, "line.");
	});
});
