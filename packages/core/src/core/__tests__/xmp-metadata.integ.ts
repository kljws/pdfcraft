import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReferenceInstance } from "../../__tests__/fixtures/reference-render.ts";
import type { DocumentDefinition } from "../../types/index.ts";

const facturXDescription = `<rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
  <fx:DocumentType>INVOICE</fx:DocumentType>
  <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
  <fx:Version>1.0</fx:Version>
  <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
</rdf:Description>`;

/** The XMP packet is written uncompressed, so its text can be read from the PDF bytes. */
async function xmpPacket(definition: Record<string, unknown>): Promise<string> {
	const pdf = await createReferenceInstance()
		.createPdf({ content: ["XMP"], ...definition } as unknown as DocumentDefinition)
		.getBuffer();
	const text = Buffer.from(pdf).toString("latin1");
	const start = text.indexOf("<x:xmpmeta");
	const end = text.indexOf("</x:xmpmeta>");
	expect(start, "the PDF contains an XMP packet").toBeGreaterThanOrEqual(0);
	return text.slice(start, end);
}

describe("xmpMetadata", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it("adds the RDF descriptions to the XMP packet", async () => {
		const packet = await xmpPacket({ version: "1.7", xmpMetadata: facturXDescription });
		expect(packet).toContain("<fx:DocumentType>INVOICE</fx:DocumentType>");
		expect(packet).toContain("<fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>");
		expect(packet.indexOf("fx:DocumentType")).toBeLessThan(packet.indexOf("</rdf:RDF>"));
	});

	it("accepts several descriptions, kept in order, beside the standard metadata", async () => {
		const packet = await xmpPacket({
			version: "1.7",
			subset: "PDF/A-3b",
			info: { title: "Invoice" },
			xmpMetadata: [
				facturXDescription,
				'<rdf:Description rdf:about="" xmlns:ex="urn:example"><ex:Tag>Second</ex:Tag></rdf:Description>',
			],
		});
		expect(packet.indexOf("fx:DocumentType")).toBeLessThan(
			packet.indexOf("<ex:Tag>Second</ex:Tag>"),
		);
		expect(packet).toContain("<pdfaid:part>3</pdfaid:part>");
		expect(packet).toContain("Invoice");
	});

	it.each([
		[{ xmpMetadata: facturXDescription }],
		[{ version: "1.3", xmpMetadata: facturXDescription }],
	])("rejects XMP metadata for PDF 1.3, the default version: %j", async (definition) => {
		await expect(xmpPacket(definition)).rejects.toThrow(
			"Invalid xmpMetadata: PDF version 1.3 has no XMP metadata; set 'version' to 1.4 or later",
		);
	});

	it("rejects values that are not strings", async () => {
		await expect(xmpPacket({ version: "1.7", xmpMetadata: [42] })).rejects.toThrow(
			"Invalid xmpMetadata: expected a string or an array of strings",
		);
	});
});
