import { assert, beforeEach, describe, it } from "vitest";
import type { LayoutBuilder } from "../../../tests/helpers/layout-builder.ts";
import { createLayoutBuilder, sampleTestProvider } from "../../../tests/helpers/layout-builder.ts";

describe("page break layout", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	it("should not assume there is enough space left if line boundary is exactly on the page boundary (bugfix)", function () {
		var desc = [
			{
				fontSize: 72,
				stack: [
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
					{ text: "paragraph", noWrap: true },
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 2);
	});

	it("should support a switch of page orientation within a document", function () {
		var desc = [
			{
				text: "Page 1, document orientation or default portrait",
			},
			{
				text: "Page 2, landscape",
				pageBreak: "before",
				pageOrientation: "landscape",
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 2);
		assert.equal(pages[0].pageSize.orientation, "portrait");
		assert.equal(pages[1].pageSize.orientation, "landscape");
	});

	it("should support changing the page orientation to landscape consecutively", function () {
		var desc = [
			{
				text: "Page 1, document orientation or default portrait",
			},
			{
				text: "Page 2, landscape",
				pageBreak: "before",
				pageOrientation: "landscape",
			},
			{
				text: "Page 3, landscape again",
				pageBreak: "after",
				pageOrientation: "landscape",
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 3);
		assert.equal(pages[0].pageSize.orientation, "portrait");
		assert.equal(pages[1].pageSize.orientation, "landscape");
		assert.equal(pages[2].pageSize.orientation, "landscape");
	});

	it.each([
		["beforeOdd", 3],
		["beforeEven", 2],
		["afterOdd", 3],
		["afterEven", 2],
	] as const)("places content on the requested page parity for %s", function (pageBreak, page) {
		const isBefore = pageBreak.startsWith("before");
		const desc = isBefore
			? [{ text: "first" }, { text: "target", pageBreak }]
			: [{ text: "first", pageBreak }, { text: "target" }];

		const pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, page);
		assert.equal(pages[page - 1].items.length, 1);
	});

	it("should not break nodes across multiple pages when unbreakable attribute is passed", function () {
		var desc = [
			{
				stack: [
					{
						text: "first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, ",
					},
					{
						text: "beginning of another paragraph, this time long enough to be broken into several lines and then to break the containing blockanother paragraph, this time long enough to be broken into several lines and then to break the containing blockanother paragraph, this time long enough to be broken into several lines and then to break the containing blockanother paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block",
						unbreakable: true,
					},
				],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);

		assert.equal(pages.length, 2);
		assert.equal(pages[0].items.length, 33);
		assert.equal(pages[1].items.length, 53);
	});
});
