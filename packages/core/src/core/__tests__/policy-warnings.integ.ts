import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import pdfcraft from "../../index";
import PdfCraftBase from "../pdfcraft";
import type { DocumentDefinition } from "../../types/index";

const urlWarning =
	"No URL access policy defined. Consider using setUrlAccessPolicy() to restrict external resource downloads.";
const localWarning =
	"No local access policy defined. Consider using setLocalAccessPolicy() to restrict local file system access.";

const fonts = { Roboto: { normal: "fonts/Roboto/Roboto-Regular.ttf" } };
const definition: DocumentDefinition = { content: ["x"] };

describe("access policy warnings", () => {
	let warn: MockInstance<typeof console.warn>;
	beforeEach(() => {
		warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	});
	const warnings = () => warn.mock.calls.map((call) => call[0]);

	it("warns synchronously for each missing policy, URL first, on every call", () => {
		const instance = pdfcraft.createPdfCraft({ fonts });
		instance.createPdf(definition);
		expect(warnings()).toEqual([urlWarning, localWarning]);
		instance.createPdf(definition);
		expect(warnings()).toHaveLength(4);
	});

	it("warns only for the missing policy", () => {
		pdfcraft.createPdfCraft({ fonts, urlAccessPolicy: () => false }).createPdf(definition);
		pdfcraft.createPdfCraft({ fonts, localAccessPolicy: () => true }).createPdf(definition);
		pdfcraft
			.createPdfCraft({ fonts, urlAccessPolicy: () => false, localAccessPolicy: () => true })
			.createPdf(definition);
		expect(warnings()).toEqual([localWarning, urlWarning]);
	});

	it("does not warn for arguments rejected by validation", () => {
		const instance = pdfcraft.createPdfCraft({ fonts });
		expect(() => instance.createPdf("nope" as unknown as DocumentDefinition)).toThrow(
			"Parameter 'docDefinition' has an invalid type. Object expected.",
		);
		expect(() => instance.createPdf(definition, "nope" as never)).toThrow(
			"Parameter 'options' has an invalid type. Object expected.",
		);
		expect(warnings()).toEqual([]);
	});

	it("warns before rejecting invalid per-document resource limits", () => {
		expect(() =>
			pdfcraft
				.createPdfCraft({ fonts })
				.createPdf(definition, { resourceLoading: { timeout: -1 } }),
		).toThrow("Invalid resourceLoading.timeout");
		expect(warnings()).toEqual([urlWarning, localWarning]);
	});

	it("warns before a later layout failure", async () => {
		const output = pdfcraft
			.createPdfCraft({ fonts })
			.createPdf({ content: [{ pageReference: "missing" }] } as unknown as DocumentDefinition);
		expect(warnings()).toEqual([urlWarning, localWarning]);
		await expect(output.getBuffer()).rejects.toThrow("Unresolved pageReference 'missing'");
	});

	it("does not warn through the platform-neutral base used by adapters", async () => {
		await new PdfCraftBase((document) => document, { fonts }).createPdf(definition);
		expect(warnings()).toEqual([]);
	});
});
