import { describe, expect, it } from "vitest";
import { XmlDocument } from "xmldoc";
import pdfcraft from "../../src/index.ts";
import type { DocumentDefinition } from "../../src/types/index.ts";

describe("Integration test: PDF/A", () => {
	it("emits well-formed PDF/A-3 XMP without partial CIDSet streams", async () => {
		const instance = pdfcraft.createPdfCraft({
			fonts: {
				Figtree: { normal: "fonts/Figtree/Figtree-Regular.ttf" },
				FigtreeSemiBold: { normal: "fonts/Figtree/Figtree-SemiBold.ttf" },
			},
			localAccessPolicy: () => true,
			urlAccessPolicy: () => false,
		});
		const definition = {
			version: "1.7",
			subset: "PDF/A-3b",
			info: {
				title: "Invoice <2026>",
				author: "Orbe & Sève SAS",
				subject: 'Audit "A&B"',
			},
			files: {
				"factur-x.xml": {
					src: new TextEncoder().encode("<invoice />"),
					name: "factur-x.xml",
					type: "text/xml",
					relationship: "Alternative",
				},
			},
			content: [
				{ text: "Regular", font: "Figtree" },
				{ text: "Semi-bold", font: "FigtreeSemiBold" },
			],
		} as DocumentDefinition;

		const buffer = await instance.createPdf(definition).getBuffer();
		const utf8 = buffer.toString("utf8");
		const xmpStart = utf8.indexOf("<?xpacket begin=");
		const xmpEnd = utf8.indexOf("<?xpacket end=", xmpStart);
		expect(xmpStart).toBeGreaterThanOrEqual(0);
		expect(xmpEnd).toBeGreaterThan(xmpStart);
		const xmp = utf8.slice(xmpStart, utf8.indexOf("?>", xmpEnd) + 2);

		expect(() => new XmlDocument(xmp)).not.toThrow();
		expect(xmp).toContain("<pdfaid:part>3</pdfaid:part>");
		expect(xmp).toContain("<pdfaid:conformance>B</pdfaid:conformance>");
		expect(xmp).toContain("Orbe &amp; Sève SAS");
		expect(xmp).toContain("Invoice &lt;2026&gt;");
		expect(xmp).toContain("Audit &quot;A&amp;B&quot;");

		const source = buffer.toString("latin1");
		// CIDSet is optional for PDF/A-2 and PDF/A-3. A partial CIDSet is invalid
		// because it must include every CID present in the embedded font program,
		// including glyphs added as composite dependencies by font subsetting.
		expect(source).not.toMatch(/\/CIDSet\b/);
		expect(source).toContain("/EmbeddedFiles");
		expect(source).toContain("/AFRelationship /Alternative");
	});
});
