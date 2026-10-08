import { assert, describe, it } from "vitest";
import { resolveTableLayout } from "../measure-table.helpers.ts";

describe("table layout resolution", function () {
	it("resolves a preset by name without registration", function () {
		assert.equal(resolveTableLayout({}, "noBorders").hLineWidth(1, {} as never), 0);
	});

	it("lets a registered layout replace a preset of the same name", function () {
		const layout = resolveTableLayout({ noBorders: { hLineWidth: () => 5 } }, "noBorders");
		assert.equal(layout.hLineWidth(1, {} as never), 5);
	});

	it("falls back to the default layout for an unknown name", function () {
		assert.equal(resolveTableLayout({}, "missing").hLineWidth(1, {} as never), 1);
	});
});
