import { describe, expect, it } from "vitest";

import type { PdfPage } from "../../types/internal";
import { resolveSectionPage, type SectionNode } from "../layout-builder.sections";

const defaults = {
	pageSize: "A4",
	pageMargins: { left: 40, top: 40, right: 40, bottom: 40 },
} as const;

describe("resolveSectionPage", () => {
	it("resolves inherited page and repeatable properties without mutating the section", () => {
		const section = {
			section: { text: "Next section" },
			pageSize: "inherit",
			pageOrientation: "inherit",
			pageMargins: "inherit",
			header: "inherit",
			footer: "inherit",
			background: "inherit",
			watermark: "inherit",
		} as SectionNode;
		const page = {
			items: [],
			pageSize: { width: 300, height: 500, orientation: "portrait" },
			pageMargins: { left: 10, top: 20, right: 30, bottom: 40 },
			customProperties: {
				header: { text: "Header" },
				footer: null,
				background: "gray",
				watermark: { text: "Draft" },
			},
		} as PdfPage;

		const result = resolveSectionPage(section, page, defaults);

		expect(result.pageSize).toEqual({ width: 300, height: 500 });
		expect(result.pageOrientation).toBe("portrait");
		expect(result.pageMargins).toEqual(page.pageMargins);
		expect(typeof result.customProperties.header).toBe("function");
		expect(result.customProperties.footer).toBeNull();
		expect(result.customProperties.background).toBe("gray");
		expect(result.customProperties.watermark).toEqual({ text: "Draft" });
		expect(section.pageSize).toBe("inherit");
		expect(section.header).toBe("inherit");
	});

	it("uses document defaults when inherited values have no previous page", () => {
		const result = resolveSectionPage(
			{
				section: { text: "First section" },
				pageSize: "inherit",
				pageMargins: "inherit",
			} as SectionNode,
			null,
			defaults,
		);

		expect(result.pageSize).toBe("A4");
		expect(result.pageMargins).toEqual(defaults.pageMargins);
	});
});
