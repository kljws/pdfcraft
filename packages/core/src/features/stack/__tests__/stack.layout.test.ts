import { assert, beforeEach, describe, it } from "vitest";
import type { LayoutBuilder } from "../../../../tests/helpers/layout-builder.ts";
import { createLayoutBuilder, sampleTestProvider } from "../../../../tests/helpers/layout-builder.ts";

describe("stack layout", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	it("should support stack of paragraphs", function () {
		var desc = [
			{
				stack: ["paragraph1", "paragraph2"],
			},
		];

		var pages = builder.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
		assert(pages[0].items[0].item.getHeight() > 0);
		assert.equal(pages[0].items.length, 2);
		assert.equal(
			pages[0].items[0].item.y + pages[0].items[0].item.getHeight(),
			pages[0].items[1].item.y,
		);
	});
	it("should apply an inherited paragraph gap between paragraphs", function () {
		const pages = builder.layoutDocument(
			[{ stack: ["paragraph1", "paragraph2"], paragraphGap: 15 }],
			sampleTestProvider,
		);

		const first = pages[0].items[0].item;
		const second = pages[0].items[1].item;
		assert.equal(second.y, first.y + first.getHeight() + 15);
	});

});


