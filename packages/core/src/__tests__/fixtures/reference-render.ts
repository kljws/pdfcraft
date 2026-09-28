import path from "node:path";
import { vi } from "vitest";
import pdfcraft from "../../index.ts";
import Renderer from "../../rendering/renderer.ts";
import type { RenderablePage } from "../../rendering/renderer.types.ts";
import type { CreatePdfOptions, DocumentDefinition } from "../../types/index.ts";
import type OutputDocumentServer from "../../output/output-document.server.ts";

/** The part of a PdfCraft instance used by the reference tests. */
export type ReferenceInstance = {
	createPdf(definition: DocumentDefinition, options?: CreatePdfOptions): OutputDocumentServer;
};

const fontDirectory = "fonts/Roboto";
const repositoryRoot = path.resolve(".");

export function createReferenceInstance(): ReferenceInstance {
	return pdfcraft.createPdfCraft({
		fonts: {
			Roboto: {
				normal: `${fontDirectory}/Roboto-Regular.ttf`,
				bold: `${fontDirectory}/Roboto-Medium.ttf`,
				italics: `${fontDirectory}/Roboto-Italic.ttf`,
				bolditalics: `${fontDirectory}/Roboto-MediumItalic.ttf`,
			},
		},
		localAccessPolicy: (filename) => path.resolve(filename).startsWith(repositoryRoot),
		urlAccessPolicy: () => false,
	});
}

const round = (value: number): number => Math.round(value * 100) / 100;
const geometryKeys = [
	"x",
	"y",
	"x1",
	"y1",
	"x2",
	"y2",
	"w",
	"h",
	"width",
	"height",
	"_width",
	"_height",
];

function serializeItem(entry: { type: string; item: Record<string, unknown> }): unknown {
	const result: Record<string, unknown> = { kind: entry.type };
	if (typeof entry.item.type === "string") result.type = entry.item.type;
	for (const key of geometryKeys) {
		const value = entry.item[key];
		if (typeof value === "number" && Number.isFinite(value)) result[key] = round(value);
	}
	if (Array.isArray(entry.item.inlines)) {
		result.text = (entry.item.inlines as Array<{ text: string }>)
			.map((inline) => inline.text)
			.join("");
	}
	return result;
}

export type ReferenceRender = {
	pdf: Uint8Array;
	layout: Array<{ pageSize: [number, number]; items: unknown[] }>;
};

/** Renders a definition through the public API and captures the final rendered page items. */
export async function renderReference(
	definition: Record<string, unknown>,
	instance: ReferenceInstance = createReferenceInstance(),
): Promise<ReferenceRender> {
	const original = Renderer.prototype.renderPages;
	let layout: ReferenceRender["layout"] = [];
	const spy = vi.spyOn(Renderer.prototype, "renderPages").mockImplementation(function (
		this: Renderer,
		pages: RenderablePage[],
	) {
		original.call(this, pages);
		layout = pages.map((page) => ({
			pageSize: [round(page.pageSize.width), round(page.pageSize.height)],
			items: (page.items as unknown as Array<{ type: string; item: Record<string, unknown> }>).map(
				serializeItem,
			),
		}));
	});
	try {
		const pdf = await instance.createPdf(definition as unknown as DocumentDefinition).getBuffer();
		return { pdf: new Uint8Array(pdf), layout };
	} finally {
		spy.mockRestore();
	}
}

/** Parses the PDF with pdf.js and returns the text of every page. */
export async function extractPdfText(pdf: Uint8Array): Promise<string[]> {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const loadingTask = pdfjs.getDocument({ data: pdf.slice(), verbosity: 0 });
	const document = await loadingTask.promise;
	try {
		const pages: string[] = [];
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
			const page = await document.getPage(pageNumber);
			const content = await page.getTextContent();
			pages.push(
				content.items
					.map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
					.join(""),
			);
		}
		return pages;
	} finally {
		await loadingTask.destroy();
	}
}
