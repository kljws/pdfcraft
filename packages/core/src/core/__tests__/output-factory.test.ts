import { beforeEach, describe, expect, it, vi } from "vitest";

import PdfCraftBase, { type OutputFactory } from "../pdfcraft";
import OutputDocument, { type PdfDocumentStream } from "../../output/output-document";

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

	it("returns the PDF stream promise when neither a factory nor an override is given", async () => {
		const result = new PdfCraftBase(options).createPdf(definition);
		expect(result).toBeInstanceOf(Promise);
		const stream = await (result as Promise<PdfDocumentStream>);
		expect(typeof stream.end).toBe("function");
	});

	it("builds the output with the factory given to the constructor", async () => {
		const factory = vi.fn<OutputFactory<LabelledOutput>>(
			(document) => new LabelledOutput(document, "factory"),
		);
		const instance = new PdfCraftBase<LabelledOutput>(options, factory);

		const output = instance.createPdf(definition);

		expect(factory).toHaveBeenCalledOnce();
		expect(factory.mock.calls[0][0]).toBeInstanceOf(Promise);
		expect(output).toBeInstanceOf(LabelledOutput);
		expect(output.label).toBe("factory");
		expect((await output.getPageInfo()).pageCount).toBe(1);
	});

	it("keeps a legacy _transformToDocument override working", async () => {
		class LegacyPdfCraft extends PdfCraftBase<LabelledOutput> {
			override _transformToDocument(document: Promise<PdfDocumentStream>): LabelledOutput {
				return new LabelledOutput(document, "legacy");
			}
		}

		const output = new LegacyPdfCraft(options).createPdf(definition);

		expect(output.label).toBe("legacy");
		expect((await output.getPageInfo()).pageCount).toBe(1);
	});

	it("gives a legacy override precedence over a factory", () => {
		const factory = vi.fn<OutputFactory<LabelledOutput>>(
			(document) => new LabelledOutput(document, "factory"),
		);
		class LegacyPdfCraft extends PdfCraftBase<LabelledOutput> {
			override _transformToDocument(document: Promise<PdfDocumentStream>): LabelledOutput {
				return new LabelledOutput(document, "legacy");
			}
		}

		const output = new LegacyPdfCraft(options, factory).createPdf(definition);

		expect(output.label).toBe("legacy");
		expect(factory).not.toHaveBeenCalled();
	});

	it("lets an override delegate to the factory through super", () => {
		class DecoratingPdfCraft extends PdfCraftBase<LabelledOutput> {
			override _transformToDocument(document: Promise<PdfDocumentStream>): LabelledOutput {
				return super._transformToDocument(document);
			}
		}
		const output = new DecoratingPdfCraft(
			options,
			(document) => new LabelledOutput(document, "factory"),
		).createPdf(definition);

		expect(output.label).toBe("factory");
	});
});

describe("Node entry output", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it("returns server output documents through its factory", async () => {
		const { default: pdfcraft } = await import("../../index");
		const { default: OutputDocumentServer } = await import("../../output/output-document.server");
		const output = pdfcraft.createPdfCraft(options).createPdf(definition);

		expect(output).toBeInstanceOf(OutputDocumentServer);
		expect(
			Buffer.from(await output.getBuffer())
				.subarray(0, 5)
				.toString(),
		).toBe("%PDF-");
	});

	it("still honours a _transformToDocument override in a subclass of the public class", async () => {
		const { default: pdfcraft } = await import("../../index");
		const wrapped: unknown[] = [];
		class Custom extends pdfcraft.PdfCraft {
			override _transformToDocument(document: Promise<PdfDocumentStream>) {
				wrapped.push(document);
				return super._transformToDocument(document);
			}
		}

		const output = new Custom(options).createPdf(definition);

		expect(wrapped).toHaveLength(1);
		expect((await output.getPageInfo()).pageCount).toBe(1);
	});
});
