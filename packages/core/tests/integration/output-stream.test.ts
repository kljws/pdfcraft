import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReferenceInstance, extractPdfText } from "../reference/reference-render.ts";
import type { DocumentDefinition } from "../../src/types/index.ts";

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
});
