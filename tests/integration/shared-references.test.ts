import { describe, expect, it } from "vitest";
import { cloneValue } from "../../src/utils/clone-document-definition.ts";
import IntegrationTestHelper, { type IntegrationPage } from "./integration-test.helpers.ts";

const getText = (pages: IntegrationPage[]): string[] =>
	pages.flatMap((page) =>
		page.items.flatMap(({ item }) =>
			item.inlines ? [item.inlines.map((inline) => inline.text).join("")] : [],
		),
	);

describe("Integration test: shared document-node references", () => {
	const testHelper = new IntegrationTestHelper();

	it("renders every occurrence of the same text node", () => {
		const shared = { text: "Repeated text" };
		const content = cloneValue([shared, shared]);

		const pages = testHelper.renderPages("A6", { content });

		expect(getText(pages).filter((text) => text === "Repeated text")).toHaveLength(2);
	});

	it("renders a shared row independently in multiple tables", () => {
		const header = [{ text: "Shared header" }, { text: "Value" }];
		const content = cloneValue([
			{ table: { headerRows: 1, body: [header, ["First", "1"]] } },
			{ table: { headerRows: 1, body: [header, ["Second", "2"]] } },
		]);

		const pages = testHelper.renderPages("A6", { content });

		expect(getText(pages).filter((text) => text === "Shared header")).toHaveLength(2);
	});
});
