import {
	detectFacturXProfile,
	facturXMetadata,
	withFacturX,
	type FacturXProfile,
} from "@pdfcraft/factur-x";
import type { DocumentDefinition } from "@pdfcraft/core/types";

const definition: DocumentDefinition = { content: ["Invoice"] };
const invoice = withFacturX(definition, { xml: "<rsm:CrossIndustryInvoice/>" });
const version: DocumentDefinition["version"] = invoice.version;
const files: NonNullable<DocumentDefinition["files"]> = invoice.files;
const profile: FacturXProfile | undefined = detectFacturXProfile(new Uint8Array());
const metadata: string[] = facturXMetadata("EN 16931");

// @ts-expect-error Unknown profiles are rejected.
withFacturX(definition, { xml: { src: "./factur-x.xml" }, profile: "FULL" });

void version;
void files;
void profile;
void metadata;
