import { beforeEach, describe, expect, it, vi } from "vitest";
import { referenceDocuments } from "./fixtures/reference-documents.ts";
import { extractPdfText, renderReference } from "./fixtures/reference-render.ts";

/**
 * Stable comparison set: every reference document is generated through the public API, parsed
 * back with pdf.js and compared with a snapshot of its final page items. A layout change in one
 * feature that moves content in another appears as a snapshot difference.
 */
describe("reference documents", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	for (const [name, reference] of Object.entries(referenceDocuments)) {
		it(
			name,
			async () => {
				const before = JSON.stringify(reference.definition);
				const { pdf, layout } = await renderReference(reference.definition);
				const pages = await extractPdfText(pdf);

				expect(pages.length).toBe(layout.length);
				const text = pages.join("\n");
				let cursor = 0;
				for (const expected of reference.expectedText) {
					const index = text.indexOf(expected, cursor);
					expect(index, `"${expected}" missing or out of order`).toBeGreaterThanOrEqual(0);
					cursor = index;
				}
				expect({ pageCount: layout.length, pages: layout }).toMatchSnapshot();
				expect(JSON.stringify(reference.definition)).toBe(before);
			},
			20_000,
		);
	}

	it("produces identical output when the same definition is generated twice", async () => {
		const reference = referenceDocuments["headers footers and references"];
		const first = await renderReference(reference.definition);
		const second = await renderReference(reference.definition);
		expect(second.layout).toEqual(first.layout);
		expect(await extractPdfText(second.pdf)).toEqual(await extractPdfText(first.pdf));
	}, 20_000);
});
