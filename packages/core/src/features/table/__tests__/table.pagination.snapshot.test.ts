import { describe, expect, it } from "vitest";
import {
	createLayoutBuilder,
	sampleTestProvider,
} from "../../../../tests/helpers/layout-builder.ts";

/**
 * Regression net for table pagination: each document is laid out end to end and every page
 * item is reduced to its type, rounded geometry and content. Any change to placement, page
 * breaks, repeated headers, spans or borders shows up as a snapshot diff.
 */

const GEOMETRY_KEYS = ["x", "y", "x1", "y1", "x2", "y2", "w", "h", "r", "width", "height"];
const STYLE_KEYS = ["type", "lineColor", "color", "lineWidth"];

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

function serializeItem(entry: { type: string; item: Record<string, unknown> }): unknown {
	const { item } = entry;
	const result: Record<string, unknown> = { kind: entry.type };
	for (const key of [...STYLE_KEYS, ...GEOMETRY_KEYS]) {
		const value = item[key];
		if (typeof value === "number") result[key] = round(value);
		else if (typeof value === "string") result[key] = value;
	}
	if (Array.isArray(item.inlines)) {
		result.text = (item.inlines as Array<{ text: string }>).map((inline) => inline.text).join("");
	}
	return result;
}

function layout(docStructure: unknown): unknown {
	const pages = createLayoutBuilder().layoutDocument(docStructure, sampleTestProvider);
	return pages.map((page) =>
		(page.items as unknown as Array<{ type: string; item: Record<string, unknown> }>).map(
			serializeItem,
		),
	);
}

const rows = (count: number, columns: number, prefix = "r"): string[][] =>
	Array.from({ length: count }, (_, row) =>
		Array.from({ length: columns }, (_, column) => `${prefix}${row}c${column}`),
	);

const paragraph = (words: number): string =>
	Array.from({ length: words }, (_, index) => `word${index}`).join(" ");

const corpus: Record<string, unknown> = {
	"long body with repeated header": {
		table: {
			widths: [100, "*", "auto"],
			header: { rows: [["H1", "H2", "H3"]] },
			body: { groups: [{ rows: rows(90, 3) }] },
		},
	},

	"row span crossing a page break": [
		{ text: paragraph(400) },
		{
			table: {
				widths: [80, 80, "*"],
				header: { rows: [["A", "B", "C"]] },
				body: {
					groups: [
						{
							rows: [
								[{ text: "spanned", rowSpan: 6 }, "b0", "c0"],
								...Array.from({ length: 5 }, (_, index) => ["", `b${index + 1}`, paragraph(30)]),
								["tail-a", "tail-b", "tail-c"],
							],
						},
					],
				},
			},
		},
	],

	"row span whose own content breaks across pages": [
		{ text: paragraph(330) },
		{
			table: {
				widths: [150, "*"],
				body: {
					groups: [
						{
							rows: [
								[{ text: paragraph(260), rowSpan: 3 }, "first"],
								["", "second"],
								["", "third"],
								["after-a", "after-b"],
							],
						},
					],
				},
			},
		},
	],

	"column spans with borders and fills": {
		table: {
			widths: ["*", "*", "*", "*"],
			body: {
				groups: [
					{
						rows: [
							[{ text: "wide", colSpan: 3, fillColor: "#eeeeee" }, "", "", "d"],
							["a", { text: "middle", colSpan: 2, border: [true, false, true, false] }, "", "d"],
							[
								{ text: "all", colSpan: 4, borderColor: ["red", "green", "blue", "black"] },
								"",
								"",
								"",
							],
							...rows(3, 4),
						],
					},
				],
			},
		},
	},

	"dontBreakRows with multi-line cells": [
		{ text: paragraph(380) },
		{
			table: {
				widths: [120, "*"],
				body: {
					groups: [
						{
							dontBreakRows: true,
							rows: Array.from({ length: 12 }, (_, index) => [`row${index}`, paragraph(40)]),
						},
					],
				},
			},
		},
	],

	"keepTogether group near the page end": [
		{ text: paragraph(320) },
		{
			table: {
				widths: ["*", "*"],
				header: { rows: [["key", "value"]] },
				body: {
					groups: [
						{ rows: rows(3, 2, "first") },
						{ keepTogether: true, rows: rows(8, 2, "kept") },
						{ rows: rows(3, 2, "last") },
					],
				},
			},
		},
	],

	"keepTogether first body group kept with the header": [
		{ text: paragraph(320) },
		{
			table: {
				widths: ["*", "*"],
				header: { rows: [["key", "value"]] },
				body: {
					groups: [{ keepTogether: true, rows: rows(8, 2, "kept") }, { rows: rows(4, 2, "rest") }],
				},
			},
		},
	],

	"fixed row heights crossing page breaks": [
		{ text: paragraph(60) },
		{
			table: {
				widths: [100, "*"],
				heights: 70,
				body: { groups: [{ rows: rows(25, 2, "fixed") }] },
			},
		},
	],

	"nested table broken across pages": {
		table: {
			widths: [60, "*"],
			body: {
				groups: [
					{
						rows: [
							[
								"outer",
								{
									table: {
										widths: ["*", "*"],
										header: { rows: [["inner-h1", "inner-h2"]] },
										body: { groups: [{ rows: rows(70, 2, "inner") }] },
									},
								},
							],
							["after", "nested"],
						],
					},
				],
			},
		},
	},

	"vertical alignment across a page break": [
		{ text: paragraph(430) },
		{
			table: {
				widths: [80, "*", 80],
				body: {
					groups: [
						{
							rows: [
								[
									{ text: "top", verticalAlignment: "top" },
									paragraph(120),
									{ text: "bottom", verticalAlignment: "bottom", fillColor: "yellow" },
								],
								[{ text: "middle", verticalAlignment: "middle" }, "short", "cell"],
							],
						},
					],
				},
			},
		},
	],

	"fixed and automatic row heights with rounded borders": {
		table: {
			widths: [100, "*"],
			heights: [40, "auto", 25],
			borderRadius: 6,
			body: {
				groups: [
					{
						rows: [
							["fixed", "forty"],
							["auto", paragraph(25)],
							["fixed", "twenty-five"],
						],
					},
				],
			},
		},
	},
};

describe("table pagination snapshots", () => {
	for (const [name, docStructure] of Object.entries(corpus)) {
		it(name, () => {
			expect(layout(docStructure)).toMatchSnapshot();
		});
	}
});
