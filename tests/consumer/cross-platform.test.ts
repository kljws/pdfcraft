import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import pdfcraft from "@pdfcraft/core";
import type { DocumentDefinition } from "@pdfcraft/core/types";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {
	crossPlatformDocuments,
	crossPlatformFonts,
	summarizePdf,
	type PdfJs,
} from "../../packages/core/src/__tests__/fixtures/cross-platform.ts";

/**
 * Generates the reference documents through the built Node.js entry. The browser suite compares
 * the built browser bundle against the same summary file, so both platforms must agree.
 */
const repositoryRoot = resolve(".");
const locate = (repositoryPath: string) => repositoryPath;

describe("cross-platform output: Node.js entry", () => {
	it("matches the shared summary of the reference documents", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const instance = pdfcraft.createPdfCraft({
			fonts: crossPlatformFonts(locate),
			urlAccessPolicy: () => false,
			localAccessPolicy: (file) => resolve(file).startsWith(repositoryRoot),
		});

		const summaries: Record<string, unknown> = {};
		for (const [name, definition] of Object.entries(crossPlatformDocuments(locate))) {
			const pdf = await instance.createPdf(definition as unknown as DocumentDefinition).getBuffer();
			summaries[name] = await summarizePdf(pdfjs as unknown as PdfJs, new Uint8Array(pdf));
		}

		await expect(`${JSON.stringify(summaries, null, "\t")}\n`).toMatchFileSnapshot(
			"../../packages/core/src/__tests__/__snapshots__/cross-platform.summary.json",
		);
	}, 60_000);
});
