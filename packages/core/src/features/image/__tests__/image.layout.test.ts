import { assert, describe, it } from "vitest";
import StyleContextStack from "../../../services/styles/style-context-stack.ts";
import { LayoutBuilder as TestLayoutBuilder } from "../../../../tests/helpers/layout-builder.ts";
import { sampleTestProvider } from "../../../../tests/helpers/layout-builder.ts";

describe("image layout", function () {
	it("should use the absolutePosition attribute without pagebreak in image", function () {
		var builderAP = new TestLayoutBuilder(
			{ width: 841.89, height: 555.28, orientation: "portrait" },
			{ left: 40, right: 40, top: 40, bottom: 40 },
		);
		builderAP.pages = [];
		builderAP.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
		builderAP.styleStack = new StyleContextStack();
		var desc = [
			{
				image: "sampleImage.jpg",
				width: 80,
				absolutePosition: { x: 250, y: 500 },
			},
			{
				image: "sampleImage.jpg",
				width: 80,
				absolutePosition: { x: 450, y: 520 },
			},
		];

		var pages = builderAP.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
	});
});
