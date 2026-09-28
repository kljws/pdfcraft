import { assert, describe, it, vi } from "vitest";
import IntegrationTestHelper from "../../../__tests__/fixtures/integration.helpers.ts";

describe("Integration test: pageBreakBefore", () => {
	const testHelper = new IntegrationTestHelper();

	it("converges when content ends near the bottom of a page", () => {
		const pageBreakBefore = vi.fn((currentNode: { startPosition: { top: number } }) =>
			Boolean(currentNode.startPosition?.top >= 740),
		);
		const expectedLines = Array.from({ length: 60 }, (_, index) => `Line ${index + 1}`);
		const content = [...expectedLines];

		const pages = testHelper.renderPages("A4", { content, pageBreakBefore });
		const renderedLines = pages.flatMap((page) =>
			page.items.flatMap(({ item }) =>
				item.inlines ? [item.inlines.map((inline) => inline.text).join("")] : [],
			),
		);

		assert.deepEqual(renderedLines, expectedLines);
		assert.isBelow(pageBreakBefore.mock.calls.length, 600);
	}, 1_000);
});

describe("Integration test: pageBreakBefore with many breaks", () => {
	const testHelper = new IntegrationTestHelper();

	it("applies every requested break beyond the layout pass limit", () => {
		const content = Array.from({ length: 15 }, (_, index) => ({
			text: `Chapter ${index + 1}`,
			headlineLevel: 1,
		}));
		const pageBreakBefore = (currentNode: {
			headlineLevel?: number;
			startPosition: { top: number };
		}) => currentNode.headlineLevel === 1 && currentNode.startPosition.top > 40;

		const pages = testHelper.renderPages("A4", { content, pageBreakBefore });

		assert.equal(pages.length, 15);
		pages.forEach((page, index) => {
			const text = page.items
				.map(({ item }) => item.inlines?.map((inline) => inline.text).join(""))
				.join("");
			assert.equal(text, `Chapter ${index + 1}`);
		});
	});
});
