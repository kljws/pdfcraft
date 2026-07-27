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
					body: {
						groups: [
							{
								rows: [
									["Column 1", "Column 2"],
									["Value 1", "Value 2"],
								],
							},
						],
					},
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

	it("renders header and body with independent layouts", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				table: {
					widths: [60, 60],
					header: {
						rows: [["Header A", "Header B"]],
						layout: {
							fillColor: "#dbeafe",
							vLineWidth: () => 1,
							hLineWidth: () => 1,
						},
					},
					body: {
						groups: [{ rows: [["Body A", "Body B"]] }],
						layout: {
							vLineWidth: (index: number, node: { table: { widths: unknown[] } }) =>
								index === 0 || index === node.table.widths.length ? 1 : 0,
							hLineWidth: () => 1,
						},
					},
				},
			},
		});

		const verticalLengths = new Map<number, number>();
		for (const entry of pages[0].items) {
			if (
				entry.type !== "vector" ||
				entry.item.type !== "line" ||
				Math.abs(entry.item.x1 - entry.item.x2) > 0.001
			) {
				continue;
			}
			const x = Number(entry.item.x1.toFixed(3));
			verticalLengths.set(
				x,
				(verticalLengths.get(x) ?? 0) + Math.abs(entry.item.y2 - entry.item.y1),
			);
		}

		const lengths = [...verticalLengths.values()];
		assert.equal(lengths.length, 3);
		assert.ok(lengths[1] < lengths[0]);
		assert.ok(lengths[1] < lengths[2]);
		assert.ok(
			pages[0].items.some(
				(entry) =>
					entry.type === "vector" && entry.item.type === "rect" && entry.item.color === "#dbeafe",
			),
		);
	});

	it("applies partial group layouts without removing structural table borders", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				table: {
					widths: [60, 60],
					body: {
						groups: [
							{
								layout: {
									hLineWidth: () => 0,
									vLineWidth: () => 0,
									paddingLeft: () => 10,
									paddingRight: () => 12,
									paddingTop: (rowIndex: number, _node: unknown, group: { rowCount: number }) => {
										assert.equal(group.rowCount, 2);
										return rowIndex === 0 ? 7 : 1;
									},
									paddingBottom: (rowIndex: number) => (rowIndex === 1 ? 9 : 1),
								},
								rows: [
									["Group A1", "Value A1"],
									["Group A2", "Value A2"],
								],
							},
							{ rows: [["Group B", "Value B"]] },
						],
						layout: {
							hLineWidth: () => 1,
							vLineWidth: () => 1,
							paddingLeft: () => 2,
							paddingRight: () => 2,
							paddingTop: () => 2,
							paddingBottom: () => 2,
						},
					},
				},
			},
		});
		const lines = getCells(pages, { pageNumber: 0 });
		assert.equal(lines.length, 6);
		assert.equal(lines[0].item.x - lines[4].item.x, 8);
		assert.equal(lines[0].item.y, testHelper.MARGINS.top + 8);
		assert.ok(lines[4].item.y - lines[2].item.y > lines[2].item.y - lines[0].item.y);
		assert.ok(lines[4].item.maxWidth > lines[0].item.maxWidth);

		const horizontalLines = pages[0].items.filter(
			(entry) =>
				entry.type === "vector" &&
				entry.item.type === "line" &&
				Math.abs(entry.item.y1 - entry.item.y2) < 0.001,
		);
		assert.equal(new Set(horizontalLines.map((entry) => entry.item.y1.toFixed(3))).size, 3);

		const verticalLines = pages[0].items.filter(
			(entry) =>
				entry.type === "vector" &&
				entry.item.type === "line" &&
				Math.abs(entry.item.x1 - entry.item.x2) < 0.001,
		);
		const xCoordinates = [...new Set(verticalLines.map((entry) => entry.item.x1.toFixed(3)))];
		assert.equal(xCoordinates.length, 3);
		const middleX = xCoordinates.sort((left, right) => Number(left) - Number(right))[1];
		assert.equal(verticalLines.filter((entry) => entry.item.x1.toFixed(3) === middleX).length, 1);
	});

	it("rounds the outer table border and corner fills", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				table: {
					borderRadius: 8,
					widths: [60, 60],
					header: {
						rows: [["Header A", "Header B"]],
						layout: {
							fillColor: "#dbeafe",
							hLineWidth: () => 1,
							vLineWidth: () => 1,
						},
					},
					body: {
						groups: [{ rows: [["Body A", "Body B"]] }],
						layout: {
							fillColor: "#f8fafc",
							hLineWidth: () => 1,
							vLineWidth: () => 1,
						},
					},
				},
			},
		});
		const paths = pages[0].items.filter(
			(entry) => entry.type === "vector" && entry.item.type === "path",
		);
		const cornerStrokes = paths.filter((entry) => entry.item.lineColor === "black");
		const roundedFills = paths.filter(
			(entry) => entry.item.color === "#dbeafe" || entry.item.color === "#f8fafc",
		);

		assert.equal(cornerStrokes.length, 4);
		assert.equal(roundedFills.length, 4);
		assert.ok(
			cornerStrokes.every(
				(entry) => typeof entry.item.d === "string" && entry.item.d.includes("Q"),
			),
		);
		assert.ok(
			roundedFills.every((entry) => typeof entry.item.d === "string" && entry.item.d.includes("Q")),
		);
	});

	it("does not mutate an unrelated vector aligned with a rounded table border", function () {
		const table = {
			borderRadius: 8,
			widths: [60, 60],
			body: {
				groups: [{ rows: [["Body A", "Body B"]] }],
				layout: { hLineWidth: () => 1, vLineWidth: () => 1 },
			},
		};
		const baseline = testHelper.renderPages("A6", { content: { table } });
		const bottomLines = baseline[0].items
			.filter(
				(entry) =>
					entry.type === "vector" && entry.item.type === "line" && entry.item.y1 === entry.item.y2,
			)
			.map((entry) => entry.item)
			.sort((left, right) => (right.y1 ?? 0) - (left.y1 ?? 0));
		const bottomLine = bottomLines[0];
		const x1 = bottomLine.x1 ?? 0;
		const x2 = bottomLine.x2 ?? 0;
		const y = bottomLine.y1 ?? 0;

		const pages = testHelper.renderPages("A6", {
			content: [
				{
					absolutePosition: { x: x1, y },
					canvas: [
						{
							type: "line",
							x1: 0,
							x2: x2 - x1,
							y1: 0,
							y2: 0,
							lineWidth: 1,
							lineColor: "#ff00ff",
						},
					],
				},
				{ table },
			],
		});
		const unrelated = pages[0].items.find(
			(entry) => entry.type === "vector" && entry.item.lineColor === "#ff00ff",
		);

		assert.ok(unrelated && unrelated.type === "vector");
		assert.equal(unrelated.item.type, "line");
		assert.equal(unrelated.item.x1, x1);
		assert.equal(unrelated.item.x2, x2);
		assert.equal(unrelated.item.y1, y);
		assert.equal(unrelated.item.y2, y);
	});

	it("rounds every fragment of a paginated table", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				table: {
					borderRadius: 7,
					widths: [80, 60],
					body: {
						groups: [
							{
								dontBreakRows: true,
								rows: Array.from({ length: 40 }, (_, index) => [`Row ${index + 1}`, "Value"]),
							},
						],
						layout: {
							hLineWidth: () => 1,
							vLineWidth: () => 1,
						},
					},
				},
			},
		});
		const roundedBorderPaths = pages.map(
			(page) =>
				page.items.filter(
					(entry) =>
						entry.type === "vector" &&
						entry.item.type === "path" &&
						entry.item.lineColor === "black",
				).length,
		);

		assert.ok(pages.length > 1);
		for (const count of roundedBorderPaths) assert.equal(count, 4);
	});

	it("repeats rounded top corners with a paginated header", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				table: {
					borderRadius: 7,
					header: {
						rows: [["Header", "Value"]],
						layout: { hLineWidth: () => 1, vLineWidth: () => 1 },
					},
					body: {
						groups: [
							{
								dontBreakRows: true,
								rows: Array.from({ length: 40 }, (_, index) => [`Row ${index + 1}`, "Value"]),
							},
						],
						layout: { hLineWidth: () => 1, vLineWidth: () => 1 },
					},
				},
			},
		});
		const roundedBorderPaths = pages.map(
			(page) =>
				page.items.filter(
					(entry) =>
						entry.type === "vector" &&
						entry.item.type === "path" &&
						entry.item.lineColor === "black",
				).length,
		);

		assert.ok(pages.length > 1);
		assert.ok(roundedBorderPaths.every((count) => count === 4));
	});

	it("keeps every physical row of a logical body group on the same page", function () {
		const pages = testHelper.renderPages("A6", {
			content: [
				{ text: "Content before the table", margin: [0, 0, 0, 210] },
				{
					table: {
						borderRadius: 7,
						header: { rows: [["HEADER", "Quantity"]] },
						heights: (rowIndex: number) => (rowIndex === 0 ? 20 : 55),
						body: {
							groups: [
								{ rows: [["EARLIER", "1"]] },
								{
									keepTogether: true,
									dontBreakRows: true,
									rows: [["GROUP_TITLE", "2"], [{ text: "GROUP_DESCRIPTION", colSpan: 2 }]],
								},
							],
							layout: { hLineWidth: () => 1, vLineWidth: () => 1 },
						},
					},
				},
			],
		});

		const pageContaining = (text: string) =>
			pages.findIndex((page) =>
				page.items.some(
					(item) =>
						item.type === "line" && item.item.inlines.some((inline) => inline.text === text),
				),
			);

		assert.ok(pages.length >= 2);
		assert.equal(pageContaining("EARLIER"), 0);
		assert.equal(pageContaining("GROUP_TITLE"), 1);
		assert.equal(pageContaining("GROUP_DESCRIPTION"), 1);
		for (const page of pages) {
			const roundedBorderPaths = page.items.filter(
				(entry) =>
					entry.type === "vector" && entry.item.type === "path" && entry.item.lineColor === "black",
			);
			assert.equal(roundedBorderPaths.length, 4);
			const horizontalLines = page.items
				.filter(
					(entry) =>
						entry.type === "vector" &&
						entry.item.type === "line" &&
						entry.item.y1 === entry.item.y2,
				)
				.map((entry) => entry.item);
			const bottomY = Math.max(...horizontalLines.map((line) => line.y1 ?? 0));
			const closingLines = horizontalLines.filter(
				(line) => Math.abs((line.y1 ?? 0) - bottomY) < 0.001,
			);
			const leftCornerX = Math.min(...roundedBorderPaths.map((entry) => entry.item.x ?? 0));
			const rightCornerX = Math.max(...roundedBorderPaths.map((entry) => entry.item.x ?? 0)) + 7;
			assert.ok(Math.min(...closingLines.map((line) => line.x1 ?? 0)) > leftCornerX);
			assert.ok(Math.max(...closingLines.map((line) => line.x2 ?? 0)) < rightCornerX);
		}
		assert.ok(
			pages[1].items.some(
				(item) =>
					item.type === "line" && item.item.inlines.some((inline) => inline.text === "HEADER"),
			),
			"the declared header should repeat before the moved group",
		);
	});

	it("moves an explicitly tall row before it overlaps the bottom margin (#1300)", function () {
		const pages = testHelper.renderPages("A4", {
			content: [
				{
					table: {
						heights: [200, 500, 70],
						body: { groups: [{ rows: [["First"], ["Second"], ["Third"]] }] },
					},
				},
			],
		});

		assert.ok(pages.length >= 2);
		const pageWithThirdRow = pages.findIndex((page) =>
			page.items.some(
				(entry) =>
					entry.type === "line" && entry.item.inlines.some((inline) => inline.text === "Third"),
			),
		);
		assert.equal(pageWithThirdRow, 1);
		const firstPageHorizontalYs = [
			...new Set(
				pages[0].items
					.filter(
						(entry) =>
							entry.type === "vector" &&
							entry.item.type === "line" &&
							Math.abs(entry.item.y1 - entry.item.y2) < 0.001,
					)
					.map((entry) => Number(entry.item.y1.toFixed(3))),
			),
		].sort((a, b) => a - b);
		assert.ok(
			firstPageHorizontalYs.length < 2 ||
				firstPageHorizontalYs.at(-1)! - firstPageHorizontalYs.at(-2)! > 1.1,
			"the closing border must replace, rather than double, the existing row border",
		);
		const thirdRowHorizontalBorders = [
			...new Set(
				pages[1].items
					.filter(
						(entry) =>
							entry.type === "vector" &&
							entry.item.type === "line" &&
							Math.abs(entry.item.y1 - entry.item.y2) < 0.001,
					)
					.map((entry) => Number(entry.item.y1.toFixed(3))),
			),
		];
		assert.ok(thirdRowHorizontalBorders.length >= 2, "expected top and bottom row borders");
		for (const page of pages) {
			for (const entry of page.items) {
				if (entry.type !== "vector") continue;
				const bottom = Math.max(entry.item.y ?? 0, entry.item.y1 ?? 0, entry.item.y2 ?? 0);
				assert.ok(bottom <= sizes.A4[1] - testHelper.MARGINS.bottom + 0.001);
			}
		}
	});

	it("keeps fixed row heights stable on every page (#1369)", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				table: {
					heights: 30,
					body: {
						groups: [
							{
								rows: Array.from({ length: 30 }, (_, index) => [
									{ text: `Row ${index + 1}`, fillColor: "#dbeafe" },
									"Column B",
								]),
							},
						],
					},
				},
			},
		});
		const fillHeights = pages.flatMap((page) =>
			page.items
				.filter(
					(entry) =>
						entry.type === "vector" && entry.item.type === "rect" && entry.item.color === "#dbeafe",
				)
				.map((entry) => Number(entry.item.h)),
		);

		assert.ok(pages.length > 1);
		assert.equal(fillHeights.length, 30);
		for (const height of fillHeights) assert.approximately(height, fillHeights[0], 0.001);
	});

	it("rejects an invalid dynamic row height before applying table geometry", function () {
		assert.throws(
			() =>
				testHelper.renderPages("A6", {
					content: {
						table: {
							heights: () => Number.NaN,
							body: { groups: [{ rows: [["Invalid height"]] }] },
						},
					},
				}),
			/Invalid table height at row 0/,
		);
	});

	it("keeps the first body row after repeated headers at full height (#2876)", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				table: {
					header: { rows: [["Header A", "Header B"]] },
					heights: 32,
					body: {
						groups: [
							{
								rows: [
									...Array.from({ length: 24 }, (_, index) => [
										{ text: `Row ${index + 1}`, fillColor: "#dcfce7" },
										"Value",
									]),
								],
							},
						],
					},
				},
			},
		});
		const fillHeights = pages.flatMap((page) =>
			page.items
				.filter(
					(entry) =>
						entry.type === "vector" && entry.item.type === "rect" && entry.item.color === "#dcfce7",
				)
				.map((entry) => Number(entry.item.h)),
		);

		assert.ok(pages.length > 1);
		assert.equal(fillHeights.length, 24);
		for (const height of fillHeights) assert.approximately(height, fillHeights[0], 0.001);
	});

	it("closes each table page when broken-line rendering is enabled (#2267, #2792, #2849)", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				table: {
					header: {
						rows: [["Header A", "Header B"]],
						layout: {
							hLineWhenBroken: true,
							hLineWidth: (index: number, node: { table: { body: unknown[] } }) =>
								index === 0 || index === 1 || index === node.table.body.length ? 2 : 0,
							vLineWidth: () => 1,
						},
					},

					body: {
						groups: [
							{
								rows: [...Array.from({ length: 30 }, (_, index) => [`Row ${index + 1}`, "Value"])],
								dontBreakRows: true,
							},
						],
						layout: {
							hLineWhenBroken: true,
							hLineWidth: (index: number, node: { table: { body: unknown[] } }) =>
								index === 0 || index === 1 || index === node.table.body.length ? 2 : 0,
							vLineWidth: () => 1,
						},
					},
				},
			},
		});

		assert.ok(pages.length > 1);
		for (const page of pages.slice(0, -1)) {
			const verticals = page.items.filter(
				(entry) =>
					entry.type === "vector" &&
					entry.item.type === "line" &&
					Math.abs(entry.item.x1 - entry.item.x2) < 0.001,
			);
			const bottom = Math.max(...verticals.map((entry) => entry.item.y2));
			const closesPage = page.items.some(
				(entry) =>
					entry.type === "vector" &&
					entry.item.type === "line" &&
					Math.abs(entry.item.y1 - entry.item.y2) < 0.001 &&
					entry.item.lineWidth === 2 &&
					Math.abs(entry.item.y1 - bottom) <= Number(entry.item.lineWidth),
			);
			assert.equal(
				closesPage,
				true,
				JSON.stringify({
					bottom,
					horizontalLines: page.items
						.filter(
							(entry) =>
								entry.type === "vector" &&
								entry.item.type === "line" &&
								Math.abs(entry.item.y1 - entry.item.y2) < 0.001,
						)
						.map((entry) => ({ y: entry.item.y1, width: entry.item.lineWidth })),
				}),
			);
		}
	});

	it("does not repeat the final table border when broken lines are disabled (#2049)", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				table: {
					body: {
						groups: [
							{
								rows: [
									["Header", "Value"],
									[{ text: "A long final row ".repeat(180) }, "Last"],
								],
							},
						],
						layout: {
							hLineWhenBroken: false,
							hLineWidth: (index: number, node: { table: { body: unknown[] } }) =>
								index === 0 || index === node.table.body.length ? 3 : 0,
							vLineWidth: () => 1,
						},
					},
				},
			},
		});

		assert.ok(pages.length > 1);
		const firstPageThickLines = pages[0].items.filter(
			(entry) =>
				entry.type === "vector" &&
				entry.item.type === "line" &&
				Math.abs(entry.item.y1 - entry.item.y2) < 0.001 &&
				entry.item.lineWidth === 3,
		);
		const lastPageThickLines = pages
			.at(-1)!
			.items.filter(
				(entry) =>
					entry.type === "vector" &&
					entry.item.type === "line" &&
					Math.abs(entry.item.y1 - entry.item.y2) < 0.001 &&
					entry.item.lineWidth === 3,
			);

		assert.equal(new Set(firstPageThickLines.map((entry) => entry.item.y1)).size, 1);
		assert.equal(new Set(lastPageThickLines.map((entry) => entry.item.y1)).size, 1);
	});

	it("moves a cell top border with a dontBreakRows row (#2763)", function () {
		const pages = testHelper.renderPages("A6", {
			content: [
				{ text: "Spacer", fontSize: 130 },
				{
					table: {
						heights: [30, 100],
						body: {
							groups: [
								{
									rows: [
										["First", "Row"],
										[
											{
												text: "Moved",
												border: [false, true, false, false],
												borderColor: ["black", "#dc2626", "black", "black"],
											},
											"Row",
										],
									],
									dontBreakRows: true,
								},
							],
							layout: { defaultBorder: false },
						},
					},
				},
			],
		});
		const redLinesByPage = pages.map(
			(page) =>
				page.items.filter((entry) => entry.type === "vector" && entry.item.lineColor === "#dc2626")
					.length,
		);

		assert.ok(pages.length > 1);
		assert.equal(redLinesByPage[0], 0);
		assert.ok(redLinesByPage[1] > 0);
	});

	it("does not force a page-bottom segment for a borderless cell (#2869)", function () {
		const pages = testHelper.renderPages("A4", {
			content: [
				{ text: " ", fontSize: 360 },
				{
					table: {
						widths: ["*", "*", "*", "*"],
						heights: 50,
						body: {
							groups: [
								{
									rows: Array.from({ length: 8 }, (_, index) =>
										index % 2 === 0
											? ["ABC", "DEF", "GHI", "JKL"]
											: [
													"ABC",
													{ text: `XYZ ${index}`, colSpan: 2 },
													"",
													{ text: "", border: [false, false, false, false] },
												],
									),
								},
							],
						},
					},
				},
			],
		});

		assert.ok(pages.length > 1);
		const firstPageVerticals = pages[0].items.filter(
			(entry) =>
				entry.type === "vector" &&
				entry.item.type === "line" &&
				Math.abs(entry.item.x1 - entry.item.x2) < 0.001,
		);
		const columnEdges = [...new Set(firstPageVerticals.map((entry) => entry.item.x1))].sort(
			(a, b) => a - b,
		);
		const rightEdge = columnEdges.at(-1)!;
		const lastColumnLeft = columnEdges.at(-2)!;
		const pageBottom = Math.max(...firstPageVerticals.map((entry) => entry.item.y2));
		const unwantedSegment = pages[0].items.some(
			(entry) =>
				entry.type === "vector" &&
				entry.item.type === "line" &&
				Math.abs(entry.item.y1 - entry.item.y2) < 0.001 &&
				Math.abs(entry.item.y1 - pageBottom) < 1.1 &&
				entry.item.x2 > lastColumnLeft,
		);

		assert.equal(
			unwantedSegment,
			false,
			JSON.stringify({
				rightEdge,
				pageBottom,
				horizontals: pages[0].items
					.filter(
						(entry) =>
							entry.type === "vector" &&
							entry.item.type === "line" &&
							Math.abs(entry.item.y1 - entry.item.y2) < 0.001,
					)
					.map((entry) => ({ x1: entry.item.x1, x2: entry.item.x2, y: entry.item.y1 })),
			}),
		);
	});

	it("aligns a fixed-width table as a complete unit", function () {
		const render = (tableAlignment: "left" | "center" | "right") => {
			const pages = testHelper.renderPages("A6", {
				content: {
					tableAlignment,
					table: { widths: [80], body: { groups: [{ rows: [["Cell"]] }] } },
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
				table: { widths: [80], body: { groups: [{ rows: [["Cell"]] }] } },
			},
		});
		const styled = testHelper.renderPages("A6", {
			styles: { centeredTable: { tableAlignment: "center" } },
			content: {
				style: "centeredTable",
				table: { widths: [80], body: { groups: [{ rows: [["Cell"]] }] } },
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
					table: { widths: ["*"], body: { groups: [{ rows: [["Cell"]] }] } },
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
					header: { rows: [["Header"]] },
					widths: [80],
					body: {
						groups: [{ rows: [...Array.from({ length: 40 }, (_, index) => [`Row ${index + 1}`])] }],
					},
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
					body: { groups: [{ rows: [["Column 1"], [{ ul: ["item 1", "item 2"] }]] }] },
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
					body: {
						groups: [
							{
								rows: [
									["Column 1", "Column 2"],
									[
										{
											table: {
												body: { groups: [{ rows: [["C1", "C2"]] }] },
											},
										},
										"Some Value",
									],
								],
							},
						],
					},
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
					body: { groups: [{ rows: [["C1", "C2"]] }] },
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
					body: { groups: [{ rows: [["C1", "Column 2"]] }] },
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
					body: {
						groups: [
							{
								rows: [
									[
										{ text: "Column 1 with colspan 2", colSpan: 2 },
										{ text: "is not rendered at all" },
										{ text: "Column 2" },
									],
								],
							},
						],
					},
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
					body: {
						groups: [
							{
								rows: [
									[{ text: "Row 1 with rowspan 2", rowSpan: 2 }],
									[{ text: "is not rendered at all" }],
									[{ text: "Row 2" }],
								],
							},
						],
					},
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
					header: { rows: [["row Header", "column B"]] },
					body: {
						groups: [
							{
								rows: [
									["row 1", "column B"],
									["row 2", "column B"],
									["row 3", "column B"],
									[{ text: "", pageBreak: "after" }, ""],
									["row 4", "column B"],
									["row 5", "column B"],
								],
								dontBreakRows: true,
							},
						],
					},
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
					body: {
						groups: [
							{
								rows: [
									["row 1", "column B"],
									["row 2", "column B"],
									["row 3", "column B"],
								],
								dontBreakRows: true,
							},
						],
					},
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
					heights: 45,
					widths: [50, 100, 200, 50],
					body: {
						groups: [
							{
								rows: [
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
								dontBreakRows: true,
							},
						],
					},
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
				header: {
					rows: [
						[
							{ text: "Dept ID", rowSpan: 2, verticalAlignment: "middle" },
							{ text: "Performance Indicators", colSpan: 3 },
							{},
							{},
							{ text: "Status", rowSpan: 2 },
						],
						[{}, "Target", "Actual", "Gap", {}],
					],
				},
				widths: ["auto", "*", "*", "*", "auto"],
				body: { groups: [{ rows: [...rows, ...rows, ...rows] }] },
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
