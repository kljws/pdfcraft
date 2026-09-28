import { PassThrough, type Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createReferenceInstance,
	extractPdfText,
} from "../../__tests__/fixtures/reference-render.ts";
import type { DocumentDefinition } from "../../types/index.ts";

const definition = { content: ["Streamed"] } as DocumentDefinition;

describe("output stream ownership with PDFKit", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it("produces a complete PDF when the caller consumes and ends the stream", async () => {
		const output = createReferenceInstance().createPdf(definition);
		const stream = await output.getStream();
		const chunks: Uint8Array[] = [];
		const done = new Promise<void>((resolve) => stream.on("end", () => resolve()));
		stream.on("data", (chunk) => chunks.push(chunk as Uint8Array));
		stream.end();
		await done;

		const pdf = new Uint8Array(Buffer.concat(chunks));
		expect(await extractPdfText(pdf)).toEqual([expect.stringContaining("Streamed")]);
		await expect(output.getBuffer()).rejects.toThrow("already being consumed or was ended");
	});

	it("rejects collection instead of hanging when the caller is reading the stream", async () => {
		const output = createReferenceInstance().createPdf(definition);
		(await output.getStream()).on("data", () => undefined);
		await expect(output.getBuffer()).rejects.toThrow("already being consumed");
	});

	it("applies stream configuration made before collection", async () => {
		const output = createReferenceInstance().createPdf(definition);
		(await output.getStream()).setOpenActionAsPrint();
		const pdf = Buffer.from(await output.getBuffer()).toString("latin1");
		expect(pdf).toContain("/OpenAction");
		expect(await output.getBase64()).toBe(Buffer.from(pdf, "latin1").toString("base64"));
	});

	describe("caller consumption is tracked permanently", () => {
		const take = async () => {
			const output = createReferenceInstance().createPdf(definition);
			const stream = (await output.getStream()) as unknown as Readable;
			return { output, stream };
		};

		it("rejects collection after partial consumption followed by a pause", async () => {
			const { output, stream } = await take();
			const onData = () => undefined;
			stream.on("data", onData);
			stream.pause();
			stream.removeListener("data", onData);
			expect(stream.readableFlowing).toBe(false);
			await expect(output.getBuffer()).rejects.toThrow("already being consumed");
		});

		it("rejects collection after a manual read returned bytes", async () => {
			const { output, stream } = await take();
			expect(stream.read()).not.toBeNull();
			expect(stream.readableFlowing).toBeNull();
			await expect(output.getBuffer()).rejects.toThrow("already being consumed");
		});

		it("rejects collection after the caller piped the stream", async () => {
			const { output, stream } = await take();
			stream.pipe(new PassThrough());
			await expect(output.getBuffer()).rejects.toThrow("already being consumed");
		});

		it("allows collection after a manual read that returned nothing", async () => {
			const { output, stream } = await take();
			expect(stream.read(1e9)).toBeNull();
			const pdf = await output.getBuffer();
			expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
			expect(await extractPdfText(new Uint8Array(pdf))).toEqual([
				expect.stringContaining("Streamed"),
			]);
		});

		it("keeps repeated buffer calls working after configuration-only access", async () => {
			const { output, stream } = await take();
			(stream as unknown as { setOpenActionAsPrint(): void }).setOpenActionAsPrint();
			const first = await output.getBuffer();
			expect(await output.getBuffer()).toEqual(first);
			expect(Buffer.from(first.subarray(0, 5)).toString()).toBe("%PDF-");
		});
	});
});
