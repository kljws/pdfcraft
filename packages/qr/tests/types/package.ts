import { qrExtension } from "@pdfcraft/qr";
import type { DocumentDefinition, PdfCraftExtension } from "@pdfcraft/core/types";

const extension: PdfCraftExtension = qrExtension;
const definition: DocumentDefinition = {
	content: { qr: "typed QR", mask: 1, padding: 2 },
};

void extension;
void definition;
