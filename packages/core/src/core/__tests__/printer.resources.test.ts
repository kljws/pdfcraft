import { describe, expect, it, vi } from "vitest";

import type URLResolver from "../../resources/url-resolver";
import type { PdfCraftExtension } from "../../types";
import type { PrinterDocumentDefinition } from "../printer.types";
import { resolvePrinterUrls } from "../printer.resources";

describe("resolvePrinterUrls", () => {
	it("resolves attachment references without treating binary data as a URL", async () => {
		const binary = new Uint8Array([1, 2, 3]);
		const resolveReference = vi.fn((url: string) => `resolved:${url}`);
		const documentDefinition: PrinterDocumentDefinition = {
			content: [],
			attachments: {
				binary: { src: binary },
				remote: "https://example.com/file.txt",
			},
		};
		const resolver = {
			resolveReference,
			resolved: vi.fn(async () => {}),
		} as unknown as URLResolver;

		await resolvePrinterUrls(documentDefinition, {}, resolver);

		expect(documentDefinition.attachments).toEqual({
			binary: { src: binary },
			remote: { src: "resolved:https://example.com/file.txt" },
		});
		expect(resolveReference).toHaveBeenCalledOnce();
	});

	it("delegates extension resource resolution", async () => {
		const resolveReference = vi.fn((url: string) => `resolved:${url}`);
		const documentDefinition: PrinterDocumentDefinition & {
			assets: Record<string, string>;
		} = {
			content: [],
			assets: { logo: "https://example.com/logo.bin" },
		};
		const extension: PdfCraftExtension = {
			name: "asset",
			test: () => false,
			measure: vi.fn(),
			resolveResources: (definition, resolve) => {
				const assets = definition.assets as Record<string, string>;
				assets.logo = resolve(assets.logo);
			},
		};
		const resolver = {
			resolveReference,
			resolved: vi.fn(async () => {}),
		} as unknown as URLResolver;

		await resolvePrinterUrls(documentDefinition, {}, resolver, [extension]);

		expect(documentDefinition.assets).toEqual({
			logo: "resolved:https://example.com/logo.bin",
		});
	});
});
