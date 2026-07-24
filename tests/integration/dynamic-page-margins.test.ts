import { describe, expect, it, vi } from "vitest";

import IntegrationTestHelper from "./integration-test.helpers.ts";

describe("Integration test: dynamic page margins", () => {
	it("reflows until the callback receives the final page count", () => {
		const helper = new IntegrationTestHelper();
		const observedPageCounts: number[] = [];
		const pages = helper.renderPages("A6", {
			content: [
				{ text: "Page 1", pageBreak: "after" },
				{ text: "Page 2", pageBreak: "after" },
				{ text: "Page 3" },
			],
			pageMargins(currentPage, pageCount, pageSize) {
				observedPageCounts.push(pageCount);
				expect(pageSize.orientation).toBe("portrait");
				return currentPage === pageCount ? [40, 40, 40, 80] : 40;
			},
		});

		expect(pages).toHaveLength(3);
		expect(observedPageCounts).toContain(3);
		expect(pages.map((page) => page.pageMargins.bottom)).toEqual([40, 40, 80]);
	});

	it("positions content from each page's own horizontal margin", () => {
		const helper = new IntegrationTestHelper();
		const pages = helper.renderPages("A6", {
			content: [
				{ text: "Odd", pageBreak: "after" },
				{ text: "Even", pageBreak: "after" },
				{ text: "Odd again" },
			],
			pageMargins: (currentPage) => (currentPage % 2 === 0 ? [70, 40, 20, 40] : 20),
		});

		expect(pages.map((page) => page.pageMargins.left)).toEqual([20, 70, 20]);
		expect(pages.map((page) => page.items.find((item) => item.type === "line")?.item.x)).toEqual([
			20, 70, 20,
		]);
	});

	it("rebases repeated table headers to the current page margin", () => {
		const helper = new IntegrationTestHelper();
		const pages = helper.renderPages("A7", {
			content: {
				table: {
					header: { rows: [["Header"]] },
					body: [{ rows: [...Array.from({ length: 40 }, (_, index) => [`Row ${index + 1}`])] }],
				},
			},
			pageMargins: (currentPage) => (currentPage % 2 === 0 ? [70, 30, 20, 30] : 30),
		});

		expect(pages.length).toBeGreaterThan(1);
		for (const page of pages) {
			const header = page.items.find(
				(item) =>
					item.type === "line" &&
					item.item.inlines.map((inline) => inline.text).join("") === "Header",
			);
			expect(header?.item.x).toBe(page.pageMargins.left + 5);
		}
	});

	it("warns once when page-count-dependent margins do not converge", () => {
		const helper = new IntegrationTestHelper();
		const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

		helper.renderPages("A6", {
			content: Array.from({ length: 10 }, (_, index) => `Line ${index + 1}`),
			pageMargins: (_currentPage, pageCount) => [40, 40, 40, pageCount === 1 ? 350 : 40],
		});

		expect(warning).toHaveBeenCalledTimes(1);
		warning.mockRestore();
	});
});
