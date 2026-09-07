import { describe, expect, it } from "vitest";

import pdfcraft from "../../src/index.ts";
import IntegrationTestHelper from "./integration-test.helpers.ts";

describe("Integration test: AcroForms", () => {
	it("lays out block and inline form fields", () => {
		const pages = new IntegrationTestHelper().renderPages("A6", {
			content: [
				{
					acroform: { type: "text", id: "name" },
					width: "*",
					height: 20,
				},
				{
					text: [
						"Accept ",
						{ acroform: { type: "checkbox", id: "accept" }, width: 14, height: 14 },
					],
				},
			],
		});

		const block = pages[0].items.find((item) => item.type === "acroform");
		const line = pages[0].items.find((item) => item.type === "line");
		expect(block?.item._width).toBe(pages[0].pageSize.width - 80);
		expect(block?.item._height).toBe(20);
		expect(line?.item.inlines.some((inline) => inline.acroform?.id === "accept")).toBe(true);
	});

	it("generates PDFKit fields for every supported form type", async () => {
		const instance = pdfcraft.createPdfCraft({
			fonts: { Roboto: { normal: "fonts/Roboto/Roboto-Regular.ttf" } },
		});
		const content = (["text", "button", "list", "combo", "checkbox"] as const).map(
			(type, index) => ({
				acroform: {
					type,
					id: `field-${index}`,
					options: type === "list" || type === "combo" ? { select: ["A", "B"] } : {},
				},
				width: 100,
				height: 20,
			}),
		);

		const buffer = await instance.createPdf({ content, compress: false }).getBuffer();

		expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
		expect(buffer.includes(Buffer.from("/AcroForm"))).toBe(true);
		expect(buffer.includes(Buffer.from("/Subtype /Widget"))).toBe(true);
	});
});
