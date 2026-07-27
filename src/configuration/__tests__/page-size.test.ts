import { assert, describe, it } from "vitest";
import { normalizePageSize, type PageSizeDefinition } from "../page-size.ts";

describe("normalizePageSize", function () {
	it("does not mutate automatic-height page definitions", function () {
		const definition: PageSizeDefinition = { width: 200, height: "auto" };

		const result = normalizePageSize(definition);

		assert.equal(definition.height, "auto");
		assert.equal(result.height, Infinity);
	});
});
