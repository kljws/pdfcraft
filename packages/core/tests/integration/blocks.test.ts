import { assert, describe, it } from "vitest";
import IntegrationTestHelper from "./integration-test.helpers.ts";

describe("Integration test: decorated blocks", function () {
	const testHelper = new IntegrationTestHelper();

	it("renders a stack background, rounded border and padding", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				stack: [{ text: "Payment information", bold: true }, { text: "IBAN: FR14 0099" }],
				borderRadius: 12,
				borderWidth: 2,
				borderColor: "#334155",
				backgroundColor: "#f8fafc",
				padding: [14, 10],
			},
		});
		const vectors = pages[0].items.filter((entry) => entry.type === "vector");
		const roundedBorderCorners = vectors.filter(
			(entry) => entry.item.type === "path" && entry.item.lineColor === "#334155",
		);
		const roundedBackground = vectors.filter(
			(entry) => entry.item.type === "path" && entry.item.color === "#f8fafc",
		);
		const textLines = pages[0].items.filter((entry) => entry.type === "line");

		assert.equal(roundedBorderCorners.length, 4);
		assert.equal(roundedBackground.length, 1);
		assert.ok(textLines.every((entry) => entry.item.x >= testHelper.MARGINS.left + 16));
	});

	it("rounds every page fragment of a decorated stack", function () {
		const pages = testHelper.renderPages("A6", {
			content: {
				stack: [{ text: "Long decorated block content. ".repeat(500) }],
				borderRadius: 10,
				borderWidth: 1,
				borderColor: "#334155",
				backgroundColor: "#f8fafc",
				padding: 8,
			},
		});
		const roundedBorderPaths = pages.map(
			(page) =>
				page.items.filter(
					(entry) =>
						entry.type === "vector" &&
						entry.item.type === "path" &&
						entry.item.lineColor === "#334155",
				).length,
		);

		assert.ok(pages.length > 1);
		for (const count of roundedBorderPaths) assert.equal(count, 4);
	});
});
