import { svgExtension } from "@pdfcraft/svg";
import type { DocumentDefinition, PdfCraftExtension } from "@pdfcraft/core/types";

const extension: PdfCraftExtension = svgExtension;
const definition: DocumentDefinition = {
	content: { svg: '<svg width="20" height="10" />' },
	svgs: { logo: "https://example.com/logo.svg" },
};

void extension;
void definition;
