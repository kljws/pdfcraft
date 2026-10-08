import { assert, beforeEach, describe, it } from "vitest";
import DocumentContext from "../../../document/document-context.ts";
import { createColumnFlow } from "../column-flow.ts";

describe("column flow", function () {
	var pc: DocumentContext;

	beforeEach(function () {
		pc = new DocumentContext();
		pc.addPage(
			{ width: 400, height: 800, orientation: "portrait" },
			{ left: 40, right: 40, top: 60, bottom: 60 },
		);
	});

	describe("entering the next column", function () {
		it("should advance x by column width plus gap", function () {
			pc.beginColumnGroup(null, {}, createColumnFlow(30, []));
			pc.beginColumn(100);
			var before = pc.x;
			pc.enterNextFlowRegion();
			assert.equal(pc.x, before + 100 + 30);
		});

		it("should use specific column widths if provided", function () {
			// [100, 200, 150] widths
			pc.beginColumnGroup(null, {}, createColumnFlow(30, [100, 200, 150]));

			// Column 1 (Index 0): width 100
			pc.beginColumn(100);
			assert.equal(pc.availableWidth, 100);

			// Move to Column 2 (Index 1): width 200
			pc.enterNextFlowRegion();
			assert.equal(pc.availableWidth, 200);

			// Move to Column 3 (Index 2): width 150
			pc.enterNextFlowRegion();
			assert.equal(pc.availableWidth, 150);
		});

		it("should fallback to lastColumnWidth if specific width not defined", function () {
			// Only 2 widths defined [100, 200]
			pc.beginColumnGroup(null, {}, createColumnFlow(30, [100, 200]));

			// Column 1: 100
			pc.beginColumn(100);

			// Column 2: 200
			pc.enterNextFlowRegion();
			assert.equal(pc.availableWidth, 200);

			// Column 3: Undefined -> Fallback to last used (200) or availableWidth
			pc.enterNextFlowRegion();
			assert.equal(pc.availableWidth, 200);
		});
	});

	describe("available columns", function () {
		it("should offer the next column only while one is left and it fits the page", function () {
			pc.beginColumnGroup(null, {}, createColumnFlow(20, [150, 150]));
			pc.beginColumn(150);
			assert.ok(pc.canEnterNextFlowRegion());

			pc.enterNextFlowRegion();
			assert.ok(!pc.canEnterNextFlowRegion());
		});

		it("should not offer a column that would cross the right margin", function () {
			pc.beginColumnGroup(null, {}, createColumnFlow(20, [200, 200]));
			pc.beginColumn(200);
			assert.ok(!pc.canEnterNextFlowRegion());
		});
	});

	it("should restart in the first column at the top of a new page", function () {
		pc.beginColumnGroup([10, 0], {}, createColumnFlow(20, [150, 150]));
		pc.beginColumn(150);
		pc.enterNextFlowRegion();
		pc.moveToNextPage();

		pc.restartFlowOnNewPage();

		assert.equal(pc.snapshots.length, 1);
		assert.equal(pc.x, 40 + 10);
		assert.equal(pc.availableWidth, 150);
		assert.equal(pc.y, 60);
	});
});
