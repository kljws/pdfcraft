import { describe, expect, it } from "vitest";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import pdfcraft from "@pdfcraft/browser";
import type { DocumentDefinition } from "@pdfcraft/browser";
import {
	crossPlatformDocuments,
	crossPlatformFonts,
	summarizePdf,
	type PdfJs,
} from "../../core/tests/reference/cross-platform.ts";

/**
 * Generates the reference documents through the built browser bundle in Chromium, with the same
 * fonts and image as the Node.js check, and compares them with the same summary file.
 */
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
// Vite rewrites `new URL(literal, import.meta.url)` into served asset URLs, so each resource is
// listed with a literal path.
const RESOURCE_URLS: Record<string, string> = {
	"fonts/Roboto/Roboto-Regular.ttf": new URL(
		"../../../fonts/Roboto/Roboto-Regular.ttf",
		import.meta.url,
	).href,
	"fonts/Roboto/Roboto-Medium.ttf": new URL(
		"../../../fonts/Roboto/Roboto-Medium.ttf",
		import.meta.url,
	).href,
	"fonts/Roboto/Roboto-Italic.ttf": new URL(
		"../../../fonts/Roboto/Roboto-Italic.ttf",
		import.meta.url,
	).href,
	"fonts/Roboto/Roboto-MediumItalic.ttf": new URL(
		"../../../fonts/Roboto/Roboto-MediumItalic.ttf",
		import.meta.url,
	).href,
	"playground/shared/images/sampleImage.jpg": new URL(
		"../../../playground/shared/images/sampleImage.jpg",
		import.meta.url,
	).href,
};
const locate = (repositoryPath: string): string => {
	const url = RESOURCE_URLS[repositoryPath];
	if (!url) throw new Error(`No browser URL listed for ${repositoryPath}`);
	return url;
};

describe("cross-platform output: browser entry", () => {
	it("matches the shared summary of the reference documents", async () => {
		const instance = pdfcraft.createPdfCraft({ fonts: crossPlatformFonts(locate) });

		const summaries: Record<string, unknown> = {};
		for (const [name, definition] of Object.entries(crossPlatformDocuments(locate))) {
			const pdf = await instance.createPdf(definition as unknown as DocumentDefinition).getBuffer();
			summaries[name] = await summarizePdf(pdfjs as unknown as PdfJs, pdf);
		}

		await expect(`${JSON.stringify(summaries, null, "\t")}\n`).toMatchFileSnapshot(
			"../../core/tests/reference/__snapshots__/cross-platform.summary.json",
		);
	}, 60_000);
});
