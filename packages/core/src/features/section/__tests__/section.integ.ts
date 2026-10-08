import { describe, expect, it } from "vitest";

import sizes from "../../../configuration/page-size.constants.ts";
import IntegrationTestHelper from "../../../__tests__/fixtures/integration.helpers.ts";

describe("Integration test: sections", () => {
	it("starts a document whose first root node is a section", () => {
		const pages = new IntegrationTestHelper().renderPages("A6", {
			content: [{ section: ["First section"] }, { section: ["Second section"], pageSize: "A7" }],
		});

		expect(pages).toHaveLength(2);
		expect(pages[0].pageSize).toMatchObject({ width: sizes.A6[0], height: sizes.A6[1] });
		expect(pages[1].pageSize).toMatchObject({ width: sizes.A7[0], height: sizes.A7[1] });
	});

	describe("a leading section nested in stacks", () => {
		const section = { section: ["Nested section"], pageSize: "A5", pageMargins: [10, 20, 30, 40] };
		const expectSectionPage = (pages: ReturnType<IntegrationTestHelper["renderPages"]>) => {
			expect(pages).toHaveLength(1);
			expect(pages[0].pageSize).toMatchObject({ width: sizes.A5[0], height: sizes.A5[1] });
			expect(pages[0].pageMargins).toMatchObject({ left: 10, top: 20, right: 30, bottom: 40 });
		};

		it("establishes its page through several plain stack levels", () => {
			expectSectionPage(
				new IntegrationTestHelper().renderPages("A6", { content: [[[structuredClone(section)]]] }),
			);
		});

		it("establishes its page through a decorated stack wrapping a plain stack", () => {
			expectSectionPage(
				new IntegrationTestHelper().renderPages("A6", {
					content: { stack: [{ stack: [structuredClone(section)] }], borderWidth: 1, padding: 5 },
				}),
			);
		});
	});
});
