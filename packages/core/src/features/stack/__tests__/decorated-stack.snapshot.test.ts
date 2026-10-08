import { describe, expect, it } from "vitest";
import {
	createLayoutBuilder,
	sampleTestProvider,
} from "../../../__tests__/fixtures/layout-builder.ts";

/**
 * Regression net for decorated stacks (padding, background, border, rounded border): each document
 * is laid out end to end and every page item is reduced to its type, rounded geometry, colors and
 * path data. Any change to the decoration, its page fragments or its drawing order shows up as a
 * snapshot diff.
 */

const geometryKeys = ["x", "y", "x1", "y1", "x2", "y2", "w", "h", "r", "width", "height"];
const styleKeys = ["type", "lineColor", "color", "lineWidth", "fillOpacity", "lineJoin", "d"];

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

function serializeItem(entry: { type: string; item: Record<string, unknown> }): unknown {
	const { item } = entry;
	const result: Record<string, unknown> = { kind: entry.type };
	for (const key of [...styleKeys, ...geometryKeys]) {
		const value = item[key];
		if (typeof value === "number") result[key] = round(value);
		else if (typeof value === "string") {
			result[key] = key === "d" ? value.replace(/-?\d+(\.\d+)?/g, (n) => String(round(+n))) : value;
		}
	}
	if (Array.isArray(item.inlines)) {
		result.text = (item.inlines as Array<{ text: string }>).map((inline) => inline.text).join("");
	}
	return result;
}

type Case = { content: unknown; background?: unknown };

function layout({ content, background }: Case): unknown {
	const pages = createLayoutBuilder().layoutDocument(
		content,
		sampleTestProvider,
		{},
		{},
		background,
	);
	return pages.map((page) =>
		(page.items as unknown as Array<{ type: string; item: Record<string, unknown> }>).map(
			serializeItem,
		),
	);
}

const paragraph = (words: number): string =>
	Array.from({ length: words }, (_, index) => `word${index}`).join(" ");

const decoration = {
	borderRadius: 10,
	borderWidth: 2,
	borderColor: "#334155",
	backgroundColor: "#f8fafc",
	padding: [14, 10],
};

const corpus: Record<string, Case> = {
	"rounded border, background and padding": {
		content: { stack: ["Payment information", "IBAN: FR14 0099"], ...decoration },
	},

	"background only": {
		content: { stack: ["shaded"], backgroundColor: "#eeeeee", padding: 6 },
	},

	"square border only": {
		content: { stack: ["boxed"], borderWidth: 1 },
	},

	"rounded background without border": {
		content: {
			stack: ["soft"],
			borderRadius: 8,
			backgroundColor: "#dddddd",
			padding: [4, 2, 6, 8],
		},
	},

	"rounded block across pages": {
		content: { stack: [paragraph(450)], ...decoration },
	},

	"decorated block starting at the bottom of a page": {
		content: [{ text: paragraph(170) }, { stack: ["late block", paragraph(40)], ...decoration }],
	},

	"unbreakable decorated block moved to the next page": {
		content: [
			{ text: paragraph(160) },
			{ stack: ["kept together", paragraph(60)], unbreakable: true, ...decoration },
		],
	},

	"decorated block with margin and page break inside": {
		content: {
			stack: [{ text: "before break", pageBreak: "after" }, "after break"],
			margin: [5, 10, 15, 20],
			...decoration,
		},
	},

	"nested decorated blocks": {
		content: {
			stack: ["outer", { stack: ["inner", paragraph(30)], ...decoration, borderColor: "red" }],
			...decoration,
		},
	},

	"decorated block in columns": {
		content: {
			columns: [{ stack: ["left", paragraph(20)], ...decoration }, { text: paragraph(30) }],
			columnGap: 10,
		},
	},

	"decorated block in snaking columns": {
		content: {
			columns: [{ stack: [paragraph(250)], ...decoration }, { text: "" }],
			snakingColumns: true,
			columnGap: 10,
		},
	},

	"decorated block in a table cell": {
		content: {
			table: {
				widths: ["*", 100],
				body: {
					groups: [{ rows: [[{ stack: ["in cell", paragraph(20)], ...decoration }, "next"]] }],
				},
			},
		},
	},

	"decorated block in a filled table cell": {
		content: {
			table: {
				widths: ["*"],
				body: {
					groups: [
						{ rows: [[{ stack: [{ stack: ["inside"], ...decoration }], fillColor: "yellow" }]] },
					],
				},
			},
		},
	},

	"decorated block over a page background": {
		content: { stack: [paragraph(300)], ...decoration },
		background: { canvas: [{ type: "rect", x: 0, y: 0, w: 400, h: 800, color: "#fafafa" }] },
	},
};

describe("decorated stack snapshots", () => {
	for (const [name, documentCase] of Object.entries(corpus)) {
		it(name, () => {
			expect(layout(documentCase)).toMatchSnapshot();
		});
	}
});
