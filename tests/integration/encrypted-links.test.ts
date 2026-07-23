import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfcraft from "../../src/index.ts";

describe("Integration test: encrypted document links", () => {
	it("preserves external and named-destination links with a user password", async () => {
		const instance = pdfcraft.createPdfCraft({
			fonts: { Roboto: { normal: "fonts/Roboto/Roboto-Regular.ttf" } },
			localAccessPolicy: () => true,
			urlAccessPolicy: () => false,
		});
		const buffer = await instance
			.createPdf({
				content: [
					{ text: "External link", link: "https://example.com" },
					{ text: "Internal link", linkToDestination: "target" },
					{ text: "Target", id: "target", pageBreak: "before" },
				],
				userPassword: "123",
			})
			.getBuffer();

		const loadingTask = getDocument({ data: new Uint8Array(buffer), password: "123" });
		const document = await loadingTask.promise;
		const annotations = await (await document.getPage(1)).getAnnotations();

		expect(annotations.some((annotation) => annotation.url === "https://example.com/")).toBe(true);
		expect(annotations.some((annotation) => annotation.dest === "target")).toBe(true);
		await loadingTask.destroy();
	});
});
