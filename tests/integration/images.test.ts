import { assert, describe, it } from "vitest";
import IntegrationTestHelper from "./integration-test.helpers.ts";

describe("Integration Test: images", function () {
	var testHelper = new IntegrationTestHelper();

	var INLINE_TEST_IMAGE =
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==";

	describe("basics", function () {
		it("preserves rounded-corner and border options through layout", function () {
			const pages = testHelper.renderPages("A6", {
				content: {
					image: INLINE_TEST_IMAGE,
					width: 60,
					borderRadius: 10,
					borderWidth: 2,
					borderColor: "#dc2626",
				},
			});
			const image = pages[0].items.find((entry) => entry.type === "image")!.item;

			assert.equal(image.borderRadius, 10);
			assert.equal(image.borderWidth, 2);
			assert.equal(image._imageBorderColor, "#dc2626");
		});

		it("renders next element below image", function () {
			var imageHeight = 150;
			var dd = {
				content: [
					{
						image: INLINE_TEST_IMAGE,
						height: imageHeight,
					},
					"some Text",
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			assert.equal(pages.length, 1);

			var image = pages[0].items[0].item;
			var someElementAfterImage = pages[0].items[1].item;

			assert.equal(image.x, testHelper.MARGINS.left);
			assert.equal(image.y, testHelper.MARGINS.top);
			assert.equal(someElementAfterImage.x, testHelper.MARGINS.left);
			assert.equal(someElementAfterImage.y, testHelper.MARGINS.top + imageHeight);
		});

		it("renders image below text", function () {
			var imageHeight = 150;
			var dd = {
				content: [
					"some Text",
					{
						image: INLINE_TEST_IMAGE,
						height: imageHeight,
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			assert.equal(pages.length, 1);

			var someElementBeforeImage = pages[0].items[0].item;
			var image = pages[0].items[1].item;

			assert.equal(someElementBeforeImage.x, testHelper.MARGINS.left);
			assert.equal(someElementBeforeImage.y, testHelper.MARGINS.top);

			assert.equal(image.x, testHelper.MARGINS.left);
			assert.equal(image.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);
		});
	});
});
