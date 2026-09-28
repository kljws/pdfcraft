import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createReferenceInstance,
	extractPdfText,
} from "../../__tests__/fixtures/reference-render.ts";
import type { DocumentDefinition } from "../../types/index.ts";

const definition = (maxPagesNumber?: number) =>
	({
		maxPagesNumber,
		footer: (page: number, count: number) => `Page ${page} of ${count}`,
		content: [
			"First",
			{ text: "Second", pageBreak: "before" },
			{ text: "Third", pageBreak: "before" },
		],
	}) as DocumentDefinition;

describe("maxPagesNumber", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it("reports complete output", async () => {
		const output = createReferenceInstance().createPdf(definition());
		expect(await output.getPageInfo()).toEqual({
			pageCount: 3,
			totalPageCount: 3,
			truncated: false,
		});
	});

	it("writes an excerpt whose totals still describe the complete document", async () => {
		const output = createReferenceInstance().createPdf(definition(2));
		expect(await output.getPageInfo()).toEqual({
			pageCount: 2,
			totalPageCount: 3,
			truncated: true,
		});

		const pages = await extractPdfText(new Uint8Array(await output.getBuffer()));
		expect(pages).toHaveLength(2);
		expect(pages[1]).toContain("Page 2 of 3");
	});
});
