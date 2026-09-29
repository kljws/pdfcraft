import { describe, expect, it } from "vitest";
import { detectFacturXProfile, facturXMetadata, withFacturX, type FacturXProfile } from "../index";

const invoice = (guideline: string) =>
	`<rsm:CrossIndustryInvoice xmlns:rsm="urn:rsm" xmlns:ram="urn:ram"><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter>
		<ram:ID>${guideline}</ram:ID>
	</ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext></rsm:CrossIndustryInvoice>`;
const en16931 = invoice("urn:cen.eu:en16931:2017");

describe("detectFacturXProfile", () => {
	it.each([
		["urn:factur-x.eu:1p0:minimum", "MINIMUM"],
		["urn:factur-x.eu:1p0:basicwl", "BASIC WL"],
		["urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic", "BASIC"],
		["urn:cen.eu:en16931:2017", "EN 16931"],
		["urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended", "EXTENDED"],
	])("reads %s as %s, from text or bytes", (guideline, profile) => {
		expect(detectFacturXProfile(invoice(guideline))).toBe(profile);
		expect(detectFacturXProfile(new TextEncoder().encode(invoice(guideline)))).toBe(profile);
	});

	it("returns undefined for XML without a known profile", () => {
		expect(detectFacturXProfile(invoice("urn:example"))).toBeUndefined();
		expect(detectFacturXProfile("<invoice/>")).toBeUndefined();
	});
});

describe("withFacturX", () => {
	it("makes a PDF/A-3b, PDF 1.7 document embedding the XML and the Factur-X metadata", () => {
		const result = withFacturX({ content: ["Invoice"] }, { xml: en16931 });

		expect(result).toMatchObject({ version: "1.7", subset: "PDF/A-3b", content: ["Invoice"] });
		expect(result.files["factur-x.xml"]).toEqual({
			src: new TextEncoder().encode(en16931),
			name: "factur-x.xml",
			type: "text/xml",
			relationship: "Alternative",
			description: "Factur-X invoice",
		});
		expect(result.xmpMetadata).toEqual(facturXMetadata("EN 16931"));
	});

	it.each([
		["MINIMUM", "urn:factur-x.eu:1p0:minimum", "Data"],
		["BASIC WL", "urn:factur-x.eu:1p0:basicwl", "Data"],
		["EXTENDED", "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended", "Alternative"],
	] as const)(
		"uses the %s relationship and conformance level",
		(profile, guideline, relationship) => {
			const result = withFacturX({ content: [] }, { xml: invoice(guideline) });
			expect(result.files["factur-x.xml"]?.relationship).toBe(relationship);
			expect(result.xmpMetadata[0]).toContain(
				`<fx:ConformanceLevel>${profile}</fx:ConformanceLevel>`,
			);
		},
	);

	it("keeps existing files, XMP descriptions, a later version and another PDF/A-3 level", () => {
		const definition = {
			content: [],
			version: "1.7ext3" as const,
			subset: "PDF/A-3a" as const,
			files: { "terms.pdf": { src: "terms.pdf" } },
			xmpMetadata: '<rdf:Description rdf:about=""/>',
		};
		const result = withFacturX(definition, { xml: en16931 });

		expect(result.version).toBe("1.7ext3");
		expect(result.subset).toBe("PDF/A-3a");
		expect(Object.keys(result.files)).toEqual(["terms.pdf", "factur-x.xml"]);
		expect(result.xmpMetadata).toEqual([
			'<rdf:Description rdf:about=""/>',
			...facturXMetadata("EN 16931"),
		]);
		expect(definition.files).toEqual({ "terms.pdf": { src: "terms.pdf" } });
	});

	it("raises an older PDF version to 1.7", () => {
		expect(withFacturX({ content: [], version: "1.4" }, { xml: en16931 }).version).toBe("1.7");
	});

	it("embeds a resource reference as given when the profile is stated", () => {
		const result = withFacturX(
			{ content: [] },
			{ xml: { src: "./factur-x.xml" }, profile: "BASIC", description: "Invoice data" },
		);
		expect(result.files["factur-x.xml"]).toMatchObject({
			src: "./factur-x.xml",
			relationship: "Alternative",
			description: "Invoice data",
		});
	});

	it.each([
		[
			{ xml: { src: "./factur-x.xml" } },
			"A Factur-X profile is required when the XML is given as { src }",
		],
		[{ xml: "<invoice/>" }, "The XML declares no known Factur-X profile"],
		[
			{ xml: en16931, profile: "BASIC" as FacturXProfile },
			"The XML declares the Factur-X profile 'EN 16931', not 'BASIC'",
		],
		[{ xml: en16931, profile: "FULL" as FacturXProfile }, "Invalid Factur-X profile 'FULL'"],
	])("rejects inconsistent options: %j", (options, message) => {
		expect(() => withFacturX({ content: [] }, options)).toThrow(message);
	});

	it("rejects a non PDF/A-3 subset and an existing factur-x.xml", () => {
		expect(() => withFacturX({ content: [], subset: "PDF/A-2b" }, { xml: en16931 })).toThrow(
			"Factur-X requires a PDF/A-3 subset, not 'PDF/A-2b'",
		);
		expect(() =>
			withFacturX(
				{ content: [], files: { "factur-x.xml": { src: "other.xml" } } },
				{ xml: en16931 },
			),
		).toThrow("The definition already embeds a file named 'factur-x.xml'");
	});
});
