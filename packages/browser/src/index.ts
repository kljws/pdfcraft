import { PdfCraftBase, type FontContainer, type PdfDocumentStream } from "@pdfcraft/core/adapter";
import type { PdfCraftOptions, VfsEncoding } from "@pdfcraft/core/types";
import OutputDocumentBrowser from "./output-document.browser";

class PdfCraft extends PdfCraftBase<OutputDocumentBrowser> {
	constructor(options: PdfCraftOptions = {}) {
		super(options);
	}

	addFontContainer(fontContainer: FontContainer): void {
		this.addVirtualFileSystem(fontContainer.vfs);
		this.addFonts(fontContainer.fonts);
	}

	addVirtualFileSystem(vfs: FontContainer["vfs"]): void {
		for (const [key, value] of Object.entries(vfs)) {
			const data = typeof value === "object" ? value.data : value;
			const encoding: VfsEncoding =
				typeof value === "object" ? (value.encoding ?? "base64") : "base64";
			this.virtualfs.writeFileSync(key, data, encoding);
		}
	}

	override _transformToDocument(doc: Promise<PdfDocumentStream>): OutputDocumentBrowser {
		return new OutputDocumentBrowser(doc);
	}
}

const createPdfCraft = (options: PdfCraftOptions = {}): PdfCraft => new PdfCraft(options);
const pdfcraft = Object.assign(createPdfCraft(), { createPdfCraft, PdfCraft });

export type * from "@pdfcraft/core/types";
export default pdfcraft;
