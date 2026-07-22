import { describe, expect, it } from "vitest";

import sizes from "../../src/configuration/page-size.constants.ts";
import IntegrationTestHelper from "./integration-test.helpers.ts";

describe("Integration test: sections", () => {
	it("starts a document whose first root node is a section", () => {
		const pages = new IntegrationTestHelper().renderPages("A6", {
			content: [{ section: ["First section"] }, { section: ["Second section"], pageSize: "A7" }],
		});

		expect(pages).toHaveLength(2);
		expect(pages[0].pageSize).toMatchObject({ width: sizes.A6[0], height: sizes.A6[1] });
		expect(pages[1].pageSize).toMatchObject({ width: sizes.A7[0], height: sizes.A7[1] });
	});
});
