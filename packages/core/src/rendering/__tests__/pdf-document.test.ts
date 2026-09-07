import { assert, beforeEach, describe, expect, it, vi } from "vitest";
import { VirtualFileSystem } from "../../resources/virtual-file-system";
import PDFDocument from "../pdf-document.ts";

describe("PDFDocument", function () {
	let pdfDocument: PDFDocument;

	beforeEach(function () {
		var fontDefinitions = {
			Roboto: {
				normal: "fonts/Roboto/Roboto-Regular.ttf",
				bold: "fonts/Roboto/Roboto-Medium.ttf",
				italics: "fonts/Roboto/Roboto-Italic.ttf",
				bolditalics: "fonts/Roboto/Roboto-MediumItalic.ttf",
			},
		};
		pdfDocument = new PDFDocument(fontDefinitions);
	});

	describe("provideFont", function () {
		it("throws error when given font not present", function () {
			expect(() => pdfDocument.provideFont("Arial", true, false)).toThrow(
				"Font 'Arial' in style 'bold' is not defined in the font section of the document definition.",
			);
		});

		it("should provide normal Roboto font", function () {
			var result = pdfDocument.provideFont("Roboto", false, false);
			assert.equal(result.font.postscriptName, "Roboto-Regular");
		});

		it("should provide bold Roboto font", function () {
			var result = pdfDocument.provideFont("Roboto", true, false);
			assert.equal(result.font.postscriptName, "Roboto-Medium");
		});

		it("should provide italics Roboto font", function () {
			var result = pdfDocument.provideFont("Roboto", false, true);
			assert.equal(result.font.postscriptName, "Roboto-Italic");
		});

		it("should provide bold and italics Roboto font", function () {
			var result = pdfDocument.provideFont("Roboto", true, true);
			assert.equal(result.font.postscriptName, "Roboto-MediumItalic");
		});

		it("caches an embedded font", function () {
			const first = pdfDocument.provideFont("Roboto", false, false);
			const second = pdfDocument.provideFont("Roboto", false, false);

			expect(second).toBe(first);
		});
	});

	describe("provideImage", function () {
		it("decodes dictionary data URLs, embeds once and caches the image", function () {
			const document = new PDFDocument({}, { logo: "data:image/png;base64,AQID" });
			const image = { width: 1, height: 1, orientation: 0, embed: vi.fn() };
			const openImage = vi.spyOn(document, "openImage").mockReturnValue(image);

			expect(document.provideImage("logo")).toBe(image);
			expect(document.provideImage("logo")).toBe(image);
			expect(openImage).toHaveBeenCalledOnce();
			expect(openImage.mock.calls[0]?.[0]).toBeInstanceOf(ArrayBuffer);
			expect(image.embed).toHaveBeenCalledOnce();
		});

		it("rejects invalid dictionary entries and wraps image decoder errors", function () {
			const invalidResource = new PDFDocument({}, { bad: 42 as never });
			expect(() => invalidResource.provideImage("bad")).toThrow("Invalid image resource 'bad'");

			const invalidImage = new PDFDocument();
			vi.spyOn(invalidImage, "openImage").mockImplementation(() => {
				throw new Error("decoder failed");
			});
			expect(() => invalidImage.provideImage("broken.png")).toThrow(
				"Invalid image: Error: decoder failed",
			);
		});
	});

	describe("patterns and attachments", function () {
		it("resolves registered patterns and falls back for missing patterns", function () {
			const pattern = { id: "pattern" } as never;
			pdfDocument.patterns.grid = pattern;

			expect(pdfDocument.providePattern(["grid", "red"])).toEqual([pattern, "red"]);
			expect(pdfDocument.providePattern(["missing", "red"])).toBeNull();
			expect(pdfDocument.providePattern("red")).toBeNull();
			expect(pdfDocument.resolveColor(["grid", "blue"], "black")).toEqual([pattern, "blue"]);
			expect(pdfDocument.resolveColor(["missing", "blue"], "black")).toBe("black");
		});

		it("validates attachment definitions", function () {
			const document = new PDFDocument(
				{},
				{},
				{},
				{
					direct: { src: "attachment.txt", description: "A file" },
					missingSource: {} as never,
				},
			);

			expect(document.provideAttachment({ src: "inline.txt" })).toEqual({ src: "inline.txt" });
			expect(document.provideAttachment("direct")).toMatchObject({ src: "attachment.txt" });
			expect(() => document.provideAttachment("unknown")).toThrow("No attachment");
			expect(() => document.provideAttachment("missingSource")).toThrow(
				'The "src" key is required for attachments',
			);
		});

		it("loads attachments from the virtual file system", function () {
			const virtualfs = new VirtualFileSystem();
			virtualfs.writeFileSync("attachment.bin", new Uint8Array([1, 2, 3]));
			const document = new PDFDocument(
				{},
				{},
				{},
				{ report: { src: "attachment.bin" } },
				{},
				virtualfs,
			);

			expect(document.provideAttachment("report")).toEqual({
				src: new Uint8Array([1, 2, 3]),
			});
			expect(document.provideAttachment({ src: "attachment.bin", name: "inline.bin" })).toEqual({
				src: new Uint8Array([1, 2, 3]),
				name: "inline.bin",
			});
		});
	});

	describe("resolveColor", function () {
		it("should resolve valid color name", function () {
			assert.equal(pdfDocument.resolveColor("red"), "red");
		});

		it("should resolve default color", function () {
			assert.equal(pdfDocument.resolveColor(undefined, "red"), "red");
		});

		it("should resolve hex color", function () {
			assert.equal(pdfDocument.resolveColor("#f900f8"), "#f900f8");
		});

		it("should resolve invalid color name", function () {
			assert.equal(pdfDocument.resolveColor("invalid"), null);
		});

		it("should resolve invalid color name with default", function () {
			assert.equal(pdfDocument.resolveColor("invalid", "red"), "red");
		});

		it("returns undefined without a color or default", function () {
			expect(pdfDocument.resolveColor(undefined)).toBeUndefined();
		});
	});

	describe("document actions and local access", function () {
		it("reuses in-memory attachments without PDFKit date errors", function () {
			const source = "data:text/plain;base64,SGVsbG8=";

			expect(() => {
				pdfDocument.file(source, { name: "hello.txt" });
				pdfDocument.file(source, { name: "hello.txt" });
			}).not.toThrow();
		});

		it("sets the print open action", function () {
			const action = { end: vi.fn() };
			vi.spyOn(pdfDocument, "ref").mockReturnValue(action as never);

			pdfDocument.setOpenActionAsPrint();

			expect(pdfDocument._root.data.OpenAction).toBe(action);
			expect(action.end).toHaveBeenCalledOnce();
		});

		it("allows in-memory sources and applies the local file policy to paths", function () {
			const policy = vi.fn((path: string) => path === "allowed.txt");
			const document = new PDFDocument({}, {}, {}, {}, {}, null, policy);

			expect(() => document.validateLocalFile(new Uint8Array([1]))).not.toThrow();
			expect(() => document.validateLocalFile("data:text/plain;base64,QQ==")).not.toThrow();
			expect(() => document.validateLocalFile("allowed.txt")).not.toThrow();
			expect(() => document.validateLocalFile("denied.txt")).toThrow(
				"Access to local file denied by resource access policy: denied.txt",
			);
			expect(policy).toHaveBeenCalledTimes(2);
		});
	});
});
