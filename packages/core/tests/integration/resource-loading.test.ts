import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import pdfcraft from "../../src/index.ts";
import type { DocumentDefinition } from "../../src/types/index.ts";

const fonts = {
	Roboto: {
		normal: "fonts/Roboto/Roboto-Regular.ttf",
		bold: "fonts/Roboto/Roboto-Medium.ttf",
		italics: "fonts/Roboto/Roboto-Italic.ttf",
		bolditalics: "fonts/Roboto/Roboto-MediumItalic.ttf",
	},
};

const definition = {
	content: [{ image: "remote" }],
	images: { remote: "https://images.example.com/remote.png" },
} as DocumentDefinition;

describe("resource loading limits through createPdf", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.stubGlobal(
			"fetch",
			vi.fn(
				(_url: string, init?: RequestInit) =>
					new Promise<Response>((_resolve, reject) => {
						if (init?.signal?.aborted) reject(init.signal.reason);
						init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
					}),
			),
		);
	});
	afterEach(() => vi.unstubAllGlobals());

	const create = (resourceLoading?: { timeout?: number; maxSize?: number }) =>
		pdfcraft.createPdfCraft({
			fonts,
			urlAccessPolicy: () => true,
			localAccessPolicy: () => true,
			resourceLoading,
		});

	it("rejects the document when a download exceeds the instance timeout", async () => {
		await expect(create({ timeout: 20 }).createPdf(definition).getBuffer()).rejects.toThrow(
			"Resource download timed out after 20 ms",
		);
	});

	it("lets a document override the instance limits", async () => {
		await expect(
			create({ timeout: 60_000 })
				.createPdf(definition, { resourceLoading: { timeout: 20 } })
				.getBuffer(),
		).rejects.toThrow("timed out after 20 ms");
	});

	it("keeps instance limits when a document overrides another limit", async () => {
		await expect(
			create({ timeout: 20 })
				.createPdf(definition, { resourceLoading: { maxSize: 10 } })
				.getBuffer(),
		).rejects.toThrow("timed out after 20 ms");
	});

	it("cancels the document through an abort signal", async () => {
		const controller = new AbortController();
		const output = create().createPdf(definition, { signal: controller.signal }).getBuffer();
		controller.abort();
		await expect(output).rejects.toThrow("Resource loading was cancelled");
	});

	it("validates the limits", () => {
		expect(() => create({ timeout: -1 })).toThrow("Invalid resourceLoading.timeout");
		expect(() => create({ maxSize: 1.5 })).toThrow("Invalid resourceLoading.maxSize");
	});
});
