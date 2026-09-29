import type { AttachmentDefinition, DocumentDefinition } from "@pdfcraft/core/types";

/** Factur-X profiles, from the smallest data set to the richest. */
export type FacturXProfile = "MINIMUM" | "BASIC WL" | "BASIC" | "EN 16931" | "EXTENDED";

type ProfileDefinition = {
	/** Value of `GuidelineSpecifiedDocumentContextParameter/ID` in the XML. */
	readonly guideline: string;
	/** Relationship of the XML to the PDF: the invoice itself, or only data for it. */
	readonly relationship: "Alternative" | "Data";
};

const profiles: Readonly<Record<FacturXProfile, ProfileDefinition>> = {
	MINIMUM: { guideline: "urn:factur-x.eu:1p0:minimum", relationship: "Data" },
	"BASIC WL": { guideline: "urn:factur-x.eu:1p0:basicwl", relationship: "Data" },
	BASIC: {
		guideline: "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic",
		relationship: "Alternative",
	},
	"EN 16931": { guideline: "urn:cen.eu:en16931:2017", relationship: "Alternative" },
	EXTENDED: {
		guideline: "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended",
		relationship: "Alternative",
	},
};

/** The file name Factur-X requires for the embedded XML. */
export const facturXFileName = "factur-x.xml";

const namespace = "urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#";

export type FacturXOptions = {
	/**
	 * The CII invoice: its content as a string or bytes, or a resource PDFCraft resolves like any
	 * other file (`{ src: "./factur-x.xml" }`, a URL or a virtual file system path).
	 */
	readonly xml: string | Uint8Array | { readonly src: string };
	/**
	 * The profile of the XML. Detected from the XML content when omitted; required when the XML
	 * is given as `{ src }`. When both are available they must agree.
	 */
	readonly profile?: FacturXProfile | undefined;
	/** Description of the embedded file. */
	readonly description?: string | undefined;
};

type FacturXFields = Pick<DocumentDefinition, "version" | "subset" | "files" | "xmpMetadata">;

const escapeXml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

/** Reads the profile declared by a Factur-X CII XML, or `undefined` when it declares none known. */
export function detectFacturXProfile(xml: string | Uint8Array): FacturXProfile | undefined {
	const text = typeof xml === "string" ? xml : new TextDecoder().decode(xml);
	const match =
		/GuidelineSpecifiedDocumentContextParameter>\s*<(?:[\w-]+:)?ID>\s*([^<\s]+)\s*</.exec(text);
	const guideline = match?.[1];
	return (Object.keys(profiles) as FacturXProfile[]).find(
		(profile) => profiles[profile].guideline === guideline,
	);
}

function resolveProfile(options: FacturXOptions): FacturXProfile {
	const { xml, profile } = options;
	if (profile !== undefined && !(profile in profiles)) {
		throw new Error(`Invalid Factur-X profile '${String(profile)}'`);
	}
	if (typeof xml === "object" && !(xml instanceof Uint8Array)) {
		if (profile === undefined) {
			throw new Error("A Factur-X profile is required when the XML is given as { src }");
		}
		return profile;
	}
	const detected = detectFacturXProfile(xml);
	if (detected === undefined) {
		throw new Error(
			"The XML declares no known Factur-X profile in GuidelineSpecifiedDocumentContextParameter/ID",
		);
	}
	if (profile !== undefined && profile !== detected) {
		throw new Error(`The XML declares the Factur-X profile '${detected}', not '${profile}'`);
	}
	return detected;
}

/**
 * The XMP metadata Factur-X requires: the `fx:` properties and the PDF/A extension schema that
 * declares them.
 */
export function facturXMetadata(profile: FacturXProfile): string[] {
	const property = (name: string, description: string) => `
					<rdf:li rdf:parseType="Resource">
						<pdfaProperty:name>${name}</pdfaProperty:name>
						<pdfaProperty:valueType>Text</pdfaProperty:valueType>
						<pdfaProperty:category>external</pdfaProperty:category>
						<pdfaProperty:description>${description}</pdfaProperty:description>
					</rdf:li>`;
	return [
		`<rdf:Description rdf:about="" xmlns:fx="${namespace}">
	<fx:DocumentType>INVOICE</fx:DocumentType>
	<fx:DocumentFileName>${facturXFileName}</fx:DocumentFileName>
	<fx:Version>1.0</fx:Version>
	<fx:ConformanceLevel>${escapeXml(profile)}</fx:ConformanceLevel>
</rdf:Description>`,
		`<rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
	<pdfaExtension:schemas>
		<rdf:Bag>
			<rdf:li rdf:parseType="Resource">
				<pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
				<pdfaSchema:namespaceURI>${namespace}</pdfaSchema:namespaceURI>
				<pdfaSchema:prefix>fx</pdfaSchema:prefix>
				<pdfaSchema:property>
					<rdf:Seq>${[
						property("DocumentFileName", "The name of the embedded XML document"),
						property(
							"DocumentType",
							"The type of the hybrid document in capital letters, e.g. INVOICE or ORDER",
						),
						property(
							"Version",
							"The actual version of the standard applying to the embedded XML document",
						),
						property("ConformanceLevel", "The conformance level of the embedded XML document"),
					].join("")}
					</rdf:Seq>
				</pdfaSchema:property>
			</rdf:li>
		</rdf:Bag>
	</pdfaExtension:schemas>
</rdf:Description>`,
	];
}

const pdfA3Subsets = new Set(["PDF/A-3", "PDF/A-3a", "PDF/A-3b", "PDF/A-3u"]);

/**
 * Returns `definition` as a Factur-X invoice: PDF/A-3 (`PDF/A-3b` unless another PDF/A-3 level is
 * set), PDF 1.7 unless a later version is set, the XML embedded as `factur-x.xml` and the Factur-X
 * XMP metadata. Existing files and XMP descriptions are kept. The definition is not modified.
 *
 * This helper does not generate or validate the XML against the XSD or Schematron; validate it
 * separately.
 */
export function withFacturX<Definition extends DocumentDefinition>(
	definition: Definition,
	options: FacturXOptions,
): Definition & Required<FacturXFields> {
	const profile = resolveProfile(options);
	const subset = definition.subset ?? "PDF/A-3b";
	if (!pdfA3Subsets.has(subset)) {
		throw new Error(`Factur-X requires a PDF/A-3 subset, not '${subset}'`);
	}
	const version =
		definition.version === undefined || definition.version < "1.7" ? "1.7" : definition.version;
	if (definition.files?.[facturXFileName] !== undefined) {
		throw new Error(`The definition already embeds a file named '${facturXFileName}'`);
	}

	const { xml } = options;
	const src =
		typeof xml === "string"
			? new TextEncoder().encode(xml)
			: xml instanceof Uint8Array
				? xml
				: xml.src;
	const attachment: AttachmentDefinition = {
		src,
		name: facturXFileName,
		type: "text/xml",
		relationship: profiles[profile].relationship,
		description: options.description ?? "Factur-X invoice",
	};
	const existingMetadata = definition.xmpMetadata;
	const xmpMetadata = [
		...(existingMetadata === undefined
			? []
			: typeof existingMetadata === "string"
				? [existingMetadata]
				: existingMetadata),
		...facturXMetadata(profile),
	];

	return {
		...definition,
		version,
		subset,
		files: { ...definition.files, [facturXFileName]: attachment },
		xmpMetadata,
	};
}
