import { assert, beforeEach, describe, it } from "vitest";
import type { LayoutBuilder } from "../../../__tests__/fixtures/layout-builder.ts";
import {
	createLayoutBuilder,
	sampleTestProvider,
} from "../../../__tests__/fixtures/layout-builder.ts";

describe("LayoutBuilder", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	describe("table of content", function () {
		it("should render empty ToC", function () {
			var desc = [
				{
					toc: {
						title: { text: "INDEX" },
					},
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
		});
	});
});
