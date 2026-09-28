import { beforeEach, describe, expect, it, vi } from "vitest";

import PdfCraftBase, { type OutputFactory } from "../pdfcraft";
import OutputDocument, { type PdfDocumentStream } from "../../output/output-document";
import pdfcraft from "../../index";
import OutputDocumentServer from "../../output/output-document.server";

const fonts = {
	Roboto: {
		normal: "fonts/Roboto/Roboto-Regular.ttf",
		bold: "fonts/Roboto/Roboto-Medium.ttf",
		italics: "fonts/Roboto/Roboto-Italic.ttf",
		bolditalics: "fonts/Roboto/Roboto-MediumItalic.ttf",
	},
};
const options = { fonts, urlAccessPolicy: () => false, localAccessPolicy: () => true };
const definition = { content: ["Output factory"] };

class LabelledOutput extends OutputDocument {
	constructor(
		document: Promise<PdfDocumentStream>,
		readonly label: string,
	) {
		super(document);
	}
}

describe("output construction", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it("builds each output with the factory given to the constructor", async () => {
		const factory = vi.fn<OutputFactory<LabelledOutput>>(
			(document) => new LabelledOutput(document, "factory"),
		);
		const instance = new PdfCraftBase<LabelledOutput>(factory, options);

		const output = instance.createPdf(definition);

		expect(factory).toHaveBeenCalledOnce();
		expect(factory.mock.calls[0][0]).toBeInstanceOf(Promise);
		expect(output).toBeInstanceOf(LabelledOutput);
		expect(output.label).toBe("factory");
		expect((await output.getPageInfo()).pageCount).toBe(1);
	});

	it("returns server output documents from the Node.js entry", async () => {
		const output = pdfcraft.createPdfCraft(options).createPdf(definition);

		expect(output).toBeInstanceOf(OutputDocumentServer);
		expect(
			Buffer.from(await output.getBuffer())
				.subarray(0, 5)
				.toString(),
		).toBe("%PDF-");
	});
});
