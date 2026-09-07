import { assert, describe, it, vi } from "vitest";
import IntegrationTestHelper from "./integration-test.helpers.ts";

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
