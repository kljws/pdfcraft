import { assert, describe, it } from "vitest";
import { LayoutBuilder as TestLayoutBuilder } from "../../../../tests/helpers/layout-builder.ts";
import { sampleTestProvider } from "../../../../tests/helpers/layout-builder.ts";

describe("canvas layout", function () {
	it("should use the absolutePosition attribute without pagebreak in canvas", function () {
		var builderAP = new TestLayoutBuilder(
			{ width: 841.89, height: 555.28, orientation: "portrait" },
			{ left: 40, right: 40, top: 40, bottom: 40 },
		);
		var desc = [
			{
				absolutePosition: { x: 0, y: 0 },
				canvas: [
					{
						type: "polyline",
						lineWidth: 0,
						closePath: true,
						color: "#fce5d4",
						points: [
							{ x: 530, y: 0 },
							{ x: 650, y: 0 },
							{ x: 841.89, y: 50 },
							{ x: 841.89, y: 270 },
						],
					},
					{
						type: "polyline",
						lineWidth: 0,
						closePath: true,
						color: "#fce5d4",
						points: [
							{ x: 0, y: 400 },
							{ x: 300, y: 555.28 },
							{ x: 200, y: 555.28 },
							{ x: 0, y: 500 },
						],
					},
				],
			},
		];

		var pages = builderAP.layoutDocument(desc, sampleTestProvider);
		assert.equal(pages.length, 1);
	});
});
