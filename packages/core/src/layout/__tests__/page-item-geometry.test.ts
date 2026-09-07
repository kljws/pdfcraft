import { assert, describe, it } from "vitest";
import { calculatePageHeight, getVectorBottom } from "../page-item-geometry.ts";

describe("page item geometry", function () {
	it("includes path commands and translation in vector height", function () {
		assert.equal(getVectorBottom({ type: "path", d: "M 5 10 L 20 40", y: 7, lineWidth: 2 }), 48);
	});

	it("includes path geometry in automatic page height", function () {
		const height = calculatePageHeight(
			{
				items: [{ type: "vector", item: { type: "path", d: "M 0 0 V 80", y: 10 } }],
				pageSize: { width: 200, height: Infinity, orientation: "portrait" },
				pageMargins: { left: 10, right: 10, top: 10, bottom: 20 },
				customProperties: {},
			},
			{ left: 10, right: 10, top: 10, bottom: 20 },
		);

		assert.equal(height, 110);
	});
});
