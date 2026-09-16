import { assert, beforeEach, describe, it } from "vitest";
import type { LayoutBuilder } from "../../../tests/helpers/layout-builder.ts";
import { createLayoutBuilder, sampleTestProvider } from "../../../tests/helpers/layout-builder.ts";

describe("layout pipeline", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	it("should add new pages when theres not enough space left on current page", function () {
		var desc = [
			"first paragraph",
			"another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block",
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 2);
		assert.equal(pages[0].items.length, 60);
		assert.equal(pages[1].items.length, 11);
	});

	it("should be able to add more than 1 page if there is not enough space", function () {
		var desc = [
			"first paragraph",
			"another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block",
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 3);
		assert.equal(pages[0].items.length, 60);
		assert.equal(pages[1].items.length, 60);
		assert.equal(pages[2].items.length, 21);
	});

	it("should preserve the unconsumed top margin after a page break", function () {
		const pages = builder.layoutDocument(
			[
				{ image: "first", width: 1, height: 700 },
				{ text: "second", marginTop: 50 },
			],
			sampleTestProvider,
		);

		assert.equal(pages.length, 2);
		assert.equal(pages[1].items[0].item.y, 70);
	});

	it("should preserve the unconsumed bottom margin after a page break", function () {
		const pages = builder.layoutDocument(
			[{ image: "first", width: 1, height: 700, marginBottom: 50 }, { text: "second" }],
			sampleTestProvider,
		);

		assert.equal(pages.length, 2);
		assert.equal(pages[1].items[0].item.y, 70);
	});

	it("should throw an exception if unrecognized structure is detected", function () {
		assert.throws(function () {
			builder.layoutDocument([{ ol: ["item", { abc: "test" }] }], sampleTestProvider);
		});
	});
});


