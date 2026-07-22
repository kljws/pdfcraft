import { assert, describe, expect, it } from "vitest";
import sizes from "../../src/configuration/page-size.constants.ts";

import IntegrationTestHelper, {
	type IntegrationPage,
	type IntegrationRenderedItem,
} from "./integration-test.helpers.ts";

interface CellOptions {
	cell: number;
}

interface PageOptions {
	pageNumber: number;
}

describe("Integration test: tables", function () {
	var testHelper = new IntegrationTestHelper();

	function getColumnText(
		lines: Array<{ type: string; item: IntegrationRenderedItem }>,
		options: CellOptions,
	): string {
		return lines[options.cell].item.inlines.map((inline) => inline.text).join("");
	}

	function getCells(pages: IntegrationPage[], options: PageOptions) {
		return pages[options.pageNumber].items.filter((node) => node.type === "line");
	}

	var TABLE_PADDING_X = 4;
	var TABLE_PADDING_Y = 2;

	var TABLE_BORDER_STRENGTH = 1;
	var TABLE_LINE_HEIGHT = 2 * TABLE_PADDING_X + testHelper.LINE_HEIGHT;

	var startX = testHelper.MARGINS.left + TABLE_PADDING_X + TABLE_BORDER_STRENGTH;
	var startY = testHelper.MARGINS.top + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH;

	it("renders a simple table", function () {
		var dd = {
			content: {
				table: {
					body: [
						["Column 1", "Column 2"],
						["Value 1", "Value 2"],
					],
				},
			},
		};

		var pages = testHelper.renderPages("A6", dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 4);

		var firstColumnSpacing =
			startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH * 1 + lines[0].item.maxWidth;

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.x),
			[startX, firstColumnSpacing, startX, firstColumnSpacing],
		);

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.y),
			[
				startY,
				startY,
				testHelper.MARGINS.top + TABLE_LINE_HEIGHT,
				testHelper.MARGINS.top + TABLE_LINE_HEIGHT,
			],
		);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), "Column 1");
		assert.deepEqual(getColumnText(lines, { cell: 1 }), "Column 2");

		assert.deepEqual(getColumnText(lines, { cell: 2 }), "Value 1");
		assert.deepEqual(getColumnText(lines, { cell: 3 }), "Value 2");
	});

	it("aligns a fixed-width table as a complete unit", function () {
		const render = (tableAlignment: "left" | "center" | "right") => {
			const pages = testHelper.renderPages("A6", {
				content: {
					tableAlignment,
					table: { widths: [80], body: [["Cell"]] },
				},
			});
			const line = pages[0].items.find((item) => item.type === "line")!.item;
			const verticalBorder = pages[0].items.find(
				(item) => item.type === "vector" && item.item.x1 === item.item.x2,
			)!.item;
			return { lineX: line.x, borderX: verticalBorder.x1 };
		};

		const left = render("left");
		const center = render("center");
		const right = render("right");

		expect(center.lineX - left.lineX).toBeCloseTo((right.lineX - left.lineX) / 2);
		expect(center.borderX - left.borderX).toBeCloseTo((right.borderX - left.borderX) / 2);
		expect(right.lineX).toBeGreaterThan(center.lineX);
	});

	it("inherits tableAlignment from named styles", function () {
		const direct = testHelper.renderPages("A6", {
			content: {
				tableAlignment: "center",
				table: { widths: [80], body: [["Cell"]] },
			},
		});
		const styled = testHelper.renderPages("A6", {
			styles: { centeredTable: { tableAlignment: "center" } },
			content: {
				style: "centeredTable",
				table: { widths: [80], body: [["Cell"]] },
			},
		});

		expect(getCells(styled, { pageNumber: 0 })[0].item.x).toBeCloseTo(
			getCells(direct, { pageNumber: 0 })[0].item.x,
		);
	});

	it("does not move a full-width star table", function () {
		const renderX = (tableAlignment: "left" | "right") => {
			const pages = testHelper.renderPages("A6", {
				content: {
					tableAlignment,
					table: { widths: ["*"], body: [["Cell"]] },
				},
			});
			return getCells(pages, { pageNumber: 0 })[0].item.x;
		};

		expect(renderX("right")).toBeCloseTo(renderX("left"));
	});

	it("keeps aligned repeated headers at the same horizontal position", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				tableAlignment: "right",
				table: {
					headerRows: 1,
					widths: [80],
					body: [["Header"], ...Array.from({ length: 40 }, (_, index) => [`Row ${index + 1}`])],
				},
			},
		});
		const headerPositions = pages.map(
			(page) =>
				page.items.find(
					(item) =>
						item.type === "line" && item.item.inlines.some((inline) => inline.text === "Header"),
				)!.item.x,
		);

		expect(pages.length).toBeGreaterThan(1);
		expect(headerPositions).toHaveLength(pages.length);
		expect(headerPositions.every((position) => position === headerPositions[0])).toBe(true);
	});

	it("renders a table with nested list", function () {
		var dd = {
			content: {
				table: {
					body: [["Column 1"], [{ ul: ["item 1", "item 2"] }]],
				},
			},
		};

		var pages = testHelper.renderPages("A6", dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 3);

		var bulletSpacing = testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER);

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.x),
			[startX, startX + bulletSpacing, startX + bulletSpacing],
		);

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.y),
			[
				startY,
				testHelper.MARGINS.top + TABLE_LINE_HEIGHT,
				testHelper.MARGINS.top + TABLE_LINE_HEIGHT + testHelper.LINE_HEIGHT,
			],
		);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), "Column 1");
		assert.deepEqual(getColumnText(lines, { cell: 1 }), "item 1");
		assert.deepEqual(getColumnText(lines, { cell: 2 }), "item 2");
	});

	it("renders a table with nested table", function () {
		var dd = {
			content: {
				table: {
					body: [
						["Column 1", "Column 2"],
						[
							{
								table: {
									body: [["C1", "C2"]],
								},
							},
							"Some Value",
						],
					],
				},
			},
		};

		var pages = testHelper.renderPages("A6", dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 5);

		var firstColumnSpacing =
			startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + lines[0].item.maxWidth;

		var startSubTableX = startX + TABLE_PADDING_X + TABLE_BORDER_STRENGTH;
		var firstSubColumnSpacing =
			startSubTableX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + lines[3].item.maxWidth;

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.x),
			[startX, firstColumnSpacing, startSubTableX, firstSubColumnSpacing, firstColumnSpacing],
		);

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.y),
			[
				startY,
				startY,

				testHelper.MARGINS.top + TABLE_LINE_HEIGHT + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH,
				testHelper.MARGINS.top + TABLE_LINE_HEIGHT + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH,

				testHelper.MARGINS.top + TABLE_LINE_HEIGHT,
			],
		);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), "Column 1");
		assert.deepEqual(getColumnText(lines, { cell: 1 }), "Column 2");

		assert.deepEqual(getColumnText(lines, { cell: 2 }), "C1");
		assert.deepEqual(getColumnText(lines, { cell: 3 }), "C2");

		assert.deepEqual(getColumnText(lines, { cell: 4 }), "Some Value");
	});

	it("renders a simple table with star width", function () {
		var definedWidth = 25;
		var dd = {
			content: {
				table: {
					widths: [definedWidth, "*"],
					body: [["C1", "C2"]],
				},
			},
		};

		var pages = testHelper.renderPages("A6", dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 2);

		var firstColumnSpacing = startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + definedWidth;

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.x),
			[startX, firstColumnSpacing],
		);

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.y),
			[startY, startY],
		);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), "C1");
		assert.deepEqual(getColumnText(lines, { cell: 1 }), "C2");

		var starWidth =
			sizes.A6[0] -
			(testHelper.MARGINS.left + testHelper.MARGINS.right) -
			definedWidth -
			4 * TABLE_PADDING_X -
			3 * TABLE_BORDER_STRENGTH;
		assert.equal(lines[1].item.maxWidth, starWidth);
	});

	it("renders a simple table with auto width", function () {
		var definedWidth = 25;
		var dd = {
			content: {
				table: {
					widths: [definedWidth, "auto"],
					body: [["C1", "Column 2"]],
				},
			},
		};

		var pages = testHelper.renderPages("A6", dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 2);

		var firstColumnSpacing = startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + definedWidth;

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.x),
			[startX, firstColumnSpacing],
		);

		assert.deepEqual(
			lines.map((node) => node.item).map((item) => item.y),
			[startY, startY],
		);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), "C1");
		assert.deepEqual(getColumnText(lines, { cell: 1 }), "Column 2");

		var autoWidth = testHelper.getWidthOfString("Column 2");
		assert.equal(lines[1].item.maxWidth, autoWidth);
	});

	it("renders a simple table with colspan", function () {
		var dd = {
			content: {
				table: {
					body: [
						[
							{ text: "Column 1 with colspan 2", colSpan: 2 },
							{ text: "is not rendered at all" },
							{ text: "Column 2" },
						],
					],
				},
			},
		};

		var pages = testHelper.renderPages("A6", dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 2);

		assert.deepEqual(lines.map((node) => node.item).map((item) => item.x)[0], startX);
		assert.deepEqual(lines.map((node) => node.item).map((item) => item.y)[0], startY);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), "Column 1 with colspan 2");
		assert.deepEqual(getColumnText(lines, { cell: 1 }), "Column 2");
	});

	it("renders a simple table with rowspan", function () {
		var dd = {
			content: {
				table: {
					body: [
						[{ text: "Row 1 with rowspan 2", rowSpan: 2 }],
						[{ text: "is not rendered at all" }],
						[{ text: "Row 2" }],
					],
				},
			},
		};

		var pages = testHelper.renderPages("A6", dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 2);

		assert.deepEqual(lines.map((node) => node.item).map((item) => item.x)[0], startX);
		assert.deepEqual(lines.map((node) => node.item).map((item) => item.y)[0], startY);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), "Row 1 with rowspan 2");
		assert.deepEqual(getColumnText(lines, { cell: 1 }), "Row 2");
	});

	it("does not insert an extra page when combining headerRows, dontBreakRows and cell pageBreak", function () {
		var dd = {
			content: {
				table: {
					dontBreakRows: true,
					headerRows: 1,
					body: [
						["row Header", "column B"],
						["row 1", "column B"],
						["row 2", "column B"],
						["row 3", "column B"],
						[{ text: "", pageBreak: "after" }, ""],
						["row 4", "column B"],
						["row 5", "column B"],
					],
				},
			},
		};

		var pages = testHelper.renderPages("A6", dd);
		var page1Texts = getCells(pages, { pageNumber: 0 }).map((node) =>
			node.item.inlines.map((inline) => inline.text).join(""),
		);
		var page2Texts = getCells(pages, { pageNumber: 1 }).map((node) =>
			node.item.inlines.map((inline) => inline.text).join(""),
		);

		assert.equal(pages.length, 2);
		assert.deepEqual(page1Texts, [
			"row Header",
			"column B",
			"row 1",
			"column B",
			"row 2",
			"column B",
			"row 3",
			"column B",
			"",
			"",
		]);
		assert.deepEqual(page2Texts, [
			"row Header",
			"column B",
			"row 4",
			"column B",
			"row 5",
			"column B",
		]);
	});

	it("keeps finite page dimensions with dontBreakRows tables without headers", function () {
		var dd = {
			content: {
				table: {
					dontBreakRows: true,
					body: [
						["row 1", "column B"],
						["row 2", "column B"],
						["row 3", "column B"],
					],
				},
			},
		};

		var pages = testHelper.renderPages("A6", dd);

		pages.forEach((page) => {
			assert.equal(Number.isFinite(page.pageSize.width), true);
			assert.equal(Number.isFinite(page.pageSize.height), true);
		});
	});

	it("keeps row heights stable when rowSpan crosses pages with dontBreakRows (#2895)", function () {
		var dd = {
			content: {
				table: {
					dontBreakRows: true,
					heights: 45,
					widths: [50, 100, 200, 50],
					body: [
						["1", "2", "3", "4"],
						[{ rowSpan: 4, text: "4span" }, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 2, text: "2span" }, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 2, text: null }, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 2, text: null }, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 15, text: "span 15", maxHeight: 50 }, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 5, text: "span 5" }, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 2, text: null }, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
					],
				},
			},
		};

		var pages = testHelper.renderPages("A4", dd);
		var lastPage = pages[pages.length - 1];
		var horizontalLineYs = [
			...new Set(
				lastPage.items
					.filter(
						(node) =>
							node.type === "vector" &&
							node.item.type === "line" &&
							Math.abs(node.item.y1 - node.item.y2) < 0.001,
					)
					.map((node) => Number(node.item.y1.toFixed(3))),
			),
		].sort((a, b) => a - b);

		var maxGap = 0;
		for (var i = 1; i < horizontalLineYs.length; i++) {
			maxGap = Math.max(maxGap, horizontalLineYs[i] - horizontalLineYs[i - 1]);
		}

		// Each row is 45pt tall. A gap above ~90pt would indicate a blown-out row caused
		// by a negative discountY when a rowspan started on a previous page. Allow up to
		// 2x row height (90pt) as a safe upper bound; anything beyond that is the bug.
		assert.ok(
			maxGap < 90,
			"max gap between horizontal lines was " + maxGap + "pt, expected < 90pt",
		);
	});

	it("keeps repeated rowSpan header vertical alignment stable (#2925)", function () {
		const rows = [
			["D-001", "500", "480", "-20", "In Progress"],
			["D-002", "300", "350", "+50", "Exceeded"],
			["D-003", "750", "750", "0", "Achieved"],
			["D-004", "200", "180", "-20", "Under Review"],
			["D-005", "400", "410", "+10", "Achieved"],
		];
		const createReportTable = () => ({
			margin: [0, 5, 0, 15],
			table: {
				headerRows: 2,
				widths: ["auto", "*", "*", "*", "auto"],
				body: [
					[
						{ text: "Dept ID", rowSpan: 2, verticalAlignment: "middle" },
						{ text: "Performance Indicators", colSpan: 3 },
						{},
						{},
						{ text: "Status", rowSpan: 2 },
					],
					[{}, "Target", "Actual", "Gap", {}],
					...rows,
					...rows,
					...rows,
				],
			},
		});
		const content: unknown[] = [];
		for (let page = 1; page <= 3; page++) {
			content.push({ text: `Statistical Report - Page ${page}` }, createReportTable());
			if (page < 3) content.push({ text: "", pageBreak: "after" });
		}

		const pages = testHelper.renderPages("A4", { content });
		const viewHeights = pages.map((page) => {
			const marker = page.items.find((item) => item.type === "beginVerticalAlignment");
			assert(marker);
			return (marker.item as IntegrationRenderedItem & { getViewHeight(): number }).getViewHeight();
		});

		assert.equal(pages.length, 3);
		assert.deepEqual(viewHeights, [viewHeights[0], viewHeights[0], viewHeights[0]]);
		assert.ok(viewHeights[0] > 0);
	});
});
