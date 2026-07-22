import { assert, describe, expect, it, vi } from "vitest";
import OutputDocumentBrowser from "../../src/output/output-document.browser";
import type { PdfDocumentStream } from "../../src/output/output-document";
import { renderPdf } from "../../playground/react/src/pdf-preview.js";
import type pdfcraftEntry from "pdfcraft/browser";

type StreamListener = (...args: unknown[]) => void;

class FakePdfStream {
	#chunk: Uint8Array | null = new Uint8Array([1, 2, 3]);
	#listeners = new Map<string, StreamListener[]>();

	on(event: string, listener: StreamListener): this {
		const listeners = this.#listeners.get(event) ?? [];
		listeners.push(listener);
		this.#listeners.set(event, listeners);
		return this;
	}

	#emit(event: string, ...args: unknown[]): void {
		for (const listener of this.#listeners.get(event) ?? []) {
			listener(...args);
		}
	}

	read(): Uint8Array | null {
		const chunk = this.#chunk;
		this.#chunk = null;
		return chunk;
	}

	end(): void {
		queueMicrotask(() => {
			this.#emit("readable");
			this.#emit("end");
		});
	}

	setOpenActionAsPrint = vi.fn();
}

const createOutput = (): { output: OutputDocumentBrowser; stream: FakePdfStream } => {
	const stream = new FakePdfStream();
	return {
		output: new OutputDocumentBrowser(Promise.resolve(stream as unknown as PdfDocumentStream)),
		stream,
	};
};

describe("browser package entry", function () {
	async function assertBrowserOutput(pdfcraft: typeof pdfcraftEntry) {
		const instance = pdfcraft.createPdfCraft();
		const transform = instance as unknown as {
			_transformToDocument(document: Promise<PdfDocumentStream>): OutputDocumentBrowser;
		};
		const output = transform._transformToDocument(
			Promise.resolve(new FakePdfStream() as unknown as PdfDocumentStream),
		);

		assert.equal(typeof output.getBlob, "function");
		assert.equal(typeof output.download, "function");
		assert.equal(typeof output.open, "function");
		assert.equal(typeof output.print, "function");
		assert.equal("write" in output, false);
		assert.deepEqual(await output.getBuffer(), new Uint8Array([1, 2, 3]));
		assert.equal(await output.getBase64(), "AQID");
	}

	it("exposes browser-specific output methods from the modern ESM entry", async function () {
		assert.equal(typeof window.document.createElement, "function");
		const { default: pdfcraft } = await import("pdfcraft/browser");
		await assertBrowserOutput(pdfcraft);
	});

	it("generates a PDF with a browser-loaded font", async function () {
		const { default: pdfcraft } = await import("pdfcraft/browser");
		const instance = pdfcraft.createPdfCraft();
		const regularFont = new URL("../../fonts/Roboto/Roboto-Regular.ttf", import.meta.url).href;

		instance.addFonts({
			Roboto: {
				normal: regularFont,
				bold: regularFont,
				italics: regularFont,
				bolditalics: regularFont,
			},
		});

		const blob = await instance.createPdf({ content: ["Browser PDF"] }).getBlob();

		assert.equal(blob.type, "application/pdf");
		assert.isAbove(blob.size, 0);
	});

	it("renders interactive AcroForm controls in the playground preview", async function () {
		const { default: pdfcraft } = await import("pdfcraft/browser");
		const instance = pdfcraft.createPdfCraft();
		const regularFont = new URL("../../fonts/Roboto/Roboto-Regular.ttf", import.meta.url).href;
		instance.addFonts({
			Roboto: {
				normal: regularFont,
				bold: regularFont,
				italics: regularFont,
				bolditalics: regularFont,
			},
		});
		const blob = await instance
			.createPdf({
				content: [
					{ acroform: { type: "text", id: "name" }, width: 160, height: 20 },
					{ acroform: { type: "checkbox", id: "consent" }, width: 14, height: 14 },
					{
						acroform: {
							type: "combo",
							id: "role",
							options: { select: ["Developer", "Designer", "Reviewer"] },
						},
						width: 160,
						height: 20,
					},
				],
			})
			.getBlob();
		const container = document.createElement("div");
		container.style.width = "800px";
		document.body.append(container);

		try {
			await renderPdf({ blob, container, isCurrent: () => true });

			const name = container.querySelector<HTMLInputElement>('input[type="text"]');
			const consent = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
			expect(name?.getBoundingClientRect().width).toBeGreaterThan(0);
			expect(consent?.getBoundingClientRect().width).toBeGreaterThan(0);
			consent?.click();
			expect(consent?.checked).toBe(true);
			const role = container.querySelector<HTMLSelectElement>("select");
			expect(role?.getBoundingClientRect().width).toBeGreaterThan(0);
			expect(Array.from(role?.options ?? [], (option) => option.text).filter(Boolean)).toEqual([
				"Developer",
				"Designer",
				"Reviewer",
			]);
		} finally {
			container.remove();
		}
	});

	it("creates browser data URLs, blobs and downloads", async function () {
		const { output } = createOutput();
		const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pdfcraft");
		const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
		const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

		expect(await output.getDataUrl()).toBe("data:application/pdf;base64,AQID");
		const blob = await output.getBlob();
		expect(blob.type).toBe("application/pdf");
		expect(blob.size).toBe(3);
		await output.download("report.pdf");

		expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
		expect(click).toHaveBeenCalledOnce();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:pdfcraft");
	});

	it("opens and prints into a supplied window", async function () {
		const { output, stream } = createOutput();
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pdfcraft");
		const target = { location: { href: "" }, close: vi.fn() } as unknown as Window;

		await output.print(target);

		expect(stream.setOpenActionAsPrint).toHaveBeenCalledOnce();
		expect(target.location.href).toBe("blob:pdfcraft");
	});

	it("reports blocked windows and closes supplied windows after an open failure", async function () {
		const blocked = createOutput().output;
		vi.spyOn(window, "open").mockReturnValue(null);
		await expect(blocked.open()).rejects.toThrow("Open PDF in new window blocked by browser");

		const failing = createOutput().output;
		vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
			throw new Error("URL failed");
		});
		const target = { location: { href: "" }, close: vi.fn() } as unknown as Window;
		await expect(failing.open(target)).rejects.toThrow("URL failed");
		expect(target.close).toHaveBeenCalledOnce();
	});
});
