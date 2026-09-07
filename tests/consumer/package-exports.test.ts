import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("package exports", () => {
	it("exposes the same factory through ESM and CommonJS", async () => {
		const esm = (await import("@pdfcraft/core")).default;
		const commonjs = createRequire(import.meta.url)("@pdfcraft/core") as typeof esm;

		expect(esm.createPdfCraft).toBeTypeOf("function");
		expect(commonjs.createPdfCraft).toBeTypeOf("function");
		expect(esm.createPdfCraft()).toBeInstanceOf(esm.PdfCraft);
		expect(commonjs.createPdfCraft()).toBeInstanceOf(commonjs.PdfCraft);
	});

	it("publishes Node declarations without ambient browser or PDFKit requirements", async () => {
		for (const declaration of ["dist/index.d.mts", "dist/index.d.cts", "dist/types.d.ts"]) {
			const source = await readFile(
				new URL(`../../packages/core/${declaration}`, import.meta.url),
				"utf8",
			);
			expect(source).not.toMatch(/PDFKit\.|HeadersInit|\bBlob\b|\bWindow\b/);
		}
	});

	it("publishes the browser package separately", async () => {
		const browser = (await import("@pdfcraft/browser")).default;
		expect(browser.createPdfCraft).toBeTypeOf("function");

		const declaration = await readFile(
			new URL("../../packages/browser/dist/index.d.ts", import.meta.url),
			"utf8",
		);
		expect(declaration).not.toContain("@pdfcraft/core");
	});

	it("publishes QR and SVG as separate ESM and CommonJS extensions", async () => {
		const require = createRequire(import.meta.url);
		const qr = await import("@pdfcraft/qr");
		const svg = await import("@pdfcraft/svg");
		const qrCommonjs = require("@pdfcraft/qr") as typeof qr;
		const svgCommonjs = require("@pdfcraft/svg") as typeof svg;

		expect(qr.qrExtension.measure).toBeTypeOf("function");
		expect(qrCommonjs.qrExtension.measure).toBeTypeOf("function");
		expect(svg.svgExtension.measure).toBeTypeOf("function");
		expect(svgCommonjs.svgExtension.render).toBeTypeOf("function");
	});
});
