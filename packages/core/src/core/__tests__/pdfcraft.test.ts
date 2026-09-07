import { assert, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import pdfcraft from "../../index.ts";
import type { VirtualFileSystem } from "../../types";

pdfcraft.addFonts({
	Roboto: {
		normal: "fonts/Roboto/Roboto-Regular.ttf",
		bold: "fonts/Roboto/Roboto-Medium.ttf",
		italics: "fonts/Roboto/Roboto-Italic.ttf",
		bolditalics: "fonts/Roboto/Roboto-MediumItalic.ttf",
	},
});

describe("Node interface", function () {
	describe("createPdfCraft", function () {
		it("creates independently configurable instances", function () {
			var first = pdfcraft.createPdfCraft({ fonts: { First: { normal: "first.ttf" } } });
			var second = pdfcraft.createPdfCraft({ fonts: { Second: { normal: "second.ttf" } } });

			assert.notStrictEqual(first, second);
			expect(first).toBeInstanceOf(pdfcraft.PdfCraft);
			expect(second).toBeInstanceOf(pdfcraft.PdfCraft);
			const firstFileSystem = (first as unknown as { virtualfs: VirtualFileSystem }).virtualfs;
			const secondFileSystem = (second as unknown as { virtualfs: VirtualFileSystem }).virtualfs;
			expect(firstFileSystem).not.toBe(secondFileSystem);
		});

		it("does not mutate create options or the document definition", async function () {
			const options = Object.freeze({});
			const definition = { content: [{ text: "Immutable document" }] };
			const original = structuredClone(definition);

			await pdfcraft.createPdf(definition, options).getBuffer();

			expect(definition).toEqual(original);
		});

		it("gives per-document options priority over instance defaults", async function () {
			const instanceCallback = vi.fn();
			const documentCallback = vi.fn();
			const instance = pdfcraft.createPdfCraft({
				fonts: { Roboto: { normal: "fonts/Roboto/Roboto-Regular.ttf" } },
				progressCallback: instanceCallback,
				localAccessPolicy: () => true,
				urlAccessPolicy: () => true,
			});
			const options = Object.freeze({ progressCallback: documentCallback });

			await instance.createPdf({ content: ["Per-document callback"] }, options).getBuffer();

			expect(documentCallback).toHaveBeenCalled();
			expect(instanceCallback).not.toHaveBeenCalled();
		});
	});

	describe("getBuffer", function () {
		it("should return buffer", async function () {
			var docDefinition = {
				content: [
					"First paragraph",
					"Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines",
				],
			};

			pdfcraft.setUrlAccessPolicy(() => {
				return true;
			});

			pdfcraft.setLocalAccessPolicy(() => {
				return true;
			});

			const pdf = pdfcraft.createPdf(docDefinition);
			const buffer = await pdf.getBuffer();
			expect(buffer.length).toBeGreaterThan(4);
			expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
		});
	});

	describe("write", function () {
		it("should write file", async function () {
			var docDefinition = {
				content: [
					"First paragraph",
					"Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines",
				],
			};

			pdfcraft.setUrlAccessPolicy(() => {
				return true;
			});

			pdfcraft.setLocalAccessPolicy(() => {
				return true;
			});

			const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdfcraft-"));
			const pdfFilename = path.join(tmpDir, "document.pdf");
			try {
				const pdf = pdfcraft.createPdf(docDefinition);
				const buffer = await pdf.getBuffer();
				await pdf.write(pdfFilename);

				const written = await fs.readFile(pdfFilename);
				expect(written).toEqual(buffer);
			} finally {
				await fs.rm(tmpDir, { recursive: true, force: true });
			}
		});
	});

	describe("setUrlAccessPolicy", function () {
		it("should set url access policy", async function () {
			var docDefinition = {
				content: [
					"First paragraph",
					"Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines",
					{ image: "test1" },
				],
				images: {
					test1: "https://localhost/image.png",
				},
			};

			pdfcraft.setUrlAccessPolicy((url) => {
				const parsedUrl = new URL(url);

				if (parsedUrl.hostname === "localhost") {
					return false;
				}

				return true;
			});

			const pdf = pdfcraft.createPdf(docDefinition);
			await expect(pdf.getBuffer()).rejects.toThrow(
				"Access to URL denied by resource access policy: https://localhost/image.png",
			);
		});
	});
});
