import PdfCraftBase from "./core/pdfcraft";
import OutputDocumentServer from "./output/output-document.server";
import { isObject } from "./utils/variable-type";
import type {
	CreatePdfOptions,
	DocumentDefinition,
	LocalAccessPolicy,
	PdfCraftOptions,
} from "./types";

class PdfCraft extends PdfCraftBase<OutputDocumentServer> {
	declare localAccessPolicy: LocalAccessPolicy | undefined;

	constructor(options: PdfCraftOptions = {}) {
		super(options, (document) => new OutputDocumentServer(document));
	}

	/**
	 * Warns about missing access policies once per call, as a server can read local files and
	 * download URLs. Arguments rejected by `PdfCraftBase.createPdf` throw there without warning.
	 */
	override createPdf(
		docDefinition: DocumentDefinition,
		options: CreatePdfOptions = {},
	): OutputDocumentServer {
		if (isObject(docDefinition) && isObject(options)) {
			if (typeof this.urlAccessPolicy === "undefined") {
				console.warn(
					"No URL access policy defined. Consider using setUrlAccessPolicy() to restrict external resource downloads.",
				);
			}
			if (typeof this.localAccessPolicy === "undefined") {
				console.warn(
					"No local access policy defined. Consider using setLocalAccessPolicy() to restrict local file system access.",
				);
			}
		}
		return super.createPdf(docDefinition, options);
	}

	setLocalAccessPolicy(callback?: LocalAccessPolicy): void {
		if (callback !== undefined && typeof callback !== "function") {
			throw new Error("Parameter 'callback' has an invalid type. Function or undefined expected.");
		}

		this.localAccessPolicy = callback;
	}
}

export default Object.assign(new PdfCraft(), {
	createPdfCraft(options: PdfCraftOptions = {}): PdfCraft {
		return new PdfCraft(options);
	},
	PdfCraft,
});
