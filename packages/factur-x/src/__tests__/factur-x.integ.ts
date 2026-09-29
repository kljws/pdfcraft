import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import pdfcraft from "../../../core/src/index.ts";
import type { DocumentDefinition } from "../../../core/src/types/index.ts";
import { withFacturX } from "../index";

const xml = readFileSync("playground/shared/samples/test.xml");

describe("Factur-X PDF", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it("embeds the XML byte for byte and writes the Factur-X XMP metadata", async () => {
		const instance = pdfcraft.createPdfCraft({
			fonts: { Roboto: { normal: "fonts/Roboto/Roboto-Regular.ttf" } },
		});
		const definition = withFacturX({ content: ["Invoice"] } as DocumentDefinition, {
			xml: new Uint8Array(xml),
		});
		const pdf = new Uint8Array(await instance.createPdf(definition).getBuffer());

		const text = Buffer.from(pdf).toString("latin1");
		const packet = text.slice(text.indexOf("<x:xmpmeta"), text.indexOf("</x:xmpmeta>"));
		for (const expected of [
			"<fx:DocumentType>INVOICE</fx:DocumentType>",
			"<fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>",
			"<fx:Version>1.0</fx:Version>",
			"<fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>",
			"<pdfaSchema:prefix>fx</pdfaSchema:prefix>",
			"<pdfaid:part>3</pdfaid:part>",
		]) {
			expect(packet).toContain(expected);
		}

		const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
		const loadingTask = pdfjs.getDocument({ data: pdf, verbosity: 0 });
		const document = await loadingTask.promise;
		try {
			const attachments = await document.getAttachments();
			const entry = [...(attachments ?? [])].find(([, item]) => item.filename === "factur-x.xml");
			expect(entry, "factur-x.xml is attached").toBeDefined();
			const content = await document.getAttachmentContent(entry![0]);
			expect(Buffer.from(content!)).toEqual(xml);
		} finally {
			await loadingTask.destroy();
		}
		expect(text).toContain("/AFRelationship /Alternative");
	}, 30_000);
});
