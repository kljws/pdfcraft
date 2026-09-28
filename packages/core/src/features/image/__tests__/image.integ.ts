import { assert, describe, it } from "vitest";
import IntegrationTestHelper from "../../../__tests__/fixtures/integration.helpers.ts";

describe("Integration Test: images", function () {
	var testHelper = new IntegrationTestHelper();

	var inlineTestImage =
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==";

	describe("basics", function () {
		it("preserves rounded-corner and border options through layout", function () {
			const pages = testHelper.renderPages("A6", {
				content: {
					image: inlineTestImage,
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
						image: inlineTestImage,
						height: imageHeight,
					},
					"some Text",
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			assert.equal(pages.length, 1);

			var image = pages[0].items[0].item;
			var someElementAfterImage = pages[0].items[1].item;

			assert.equal(image.x, testHelper.margins.left);
			assert.equal(image.y, testHelper.margins.top);
			assert.equal(someElementAfterImage.x, testHelper.margins.left);
			assert.equal(someElementAfterImage.y, testHelper.margins.top + imageHeight);
		});

		it("renders image below text", function () {
			var imageHeight = 150;
			var dd = {
				content: [
					"some Text",
					{
						image: inlineTestImage,
						height: imageHeight,
					},
				],
			};

			var pages = testHelper.renderPages("A6", dd);

			assert.equal(pages.length, 1);

			var someElementBeforeImage = pages[0].items[0].item;
			var image = pages[0].items[1].item;

			assert.equal(someElementBeforeImage.x, testHelper.margins.left);
			assert.equal(someElementBeforeImage.y, testHelper.margins.top);

			assert.equal(image.x, testHelper.margins.left);
			assert.equal(image.y, testHelper.margins.top + testHelper.lineHeight);
		});
	});
});
