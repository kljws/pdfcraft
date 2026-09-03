import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import type { PdfDocumentStream } from "../output-document";
import OutputDocumentServer from "../output-document.server";

class FakeStream extends EventEmitter implements PdfDocumentStream {
	private readonly chunks: Uint8Array[];
	end = vi.fn(() => {
		queueMicrotask(() => {
			for (const chunk of this.chunks) this.emit("data", chunk);
			this.emit("end");
		});
	});
	setOpenActionAsPrint = vi.fn();

	constructor(chunks: Uint8Array[]) {
		super();
		this.chunks = [...chunks];
	}
}

describe("OutputDocumentServer", () => {
	it("collects chunks once and reuses the resulting data", async () => {
		const stream = new FakeStream([Uint8Array.from([1, 2]), Uint8Array.from([3, 4])]);
		const output = new OutputDocumentServer(Promise.resolve(stream));

		expect(await output.getStream()).toBe(stream);
		expect(await output.getBuffer()).toEqual(Buffer.from([1, 2, 3, 4]));
		expect(await output.getBase64()).toBe("AQIDBA==");
		expect(await output.getDataUrl()).toBe("data:application/pdf;base64,AQIDBA==");
		expect(stream.end).toHaveBeenCalledOnce();
	});

	it("writes the collected bytes to disk", async () => {
		const stream = new FakeStream([Uint8Array.from([37, 80, 68, 70])]);
		const output = new OutputDocumentServer(Promise.resolve(stream));
		const directory = await mkdtemp(path.join(os.tmpdir(), "pdfcraft-output-"));
		const filename = path.join(directory, "document.pdf");

		try {
			await output.write(filename);
			expect(await readFile(filename)).toEqual(Buffer.from("%PDF"));
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it("rejects when the PDF stream emits an error", async () => {
		const stream = new FakeStream([]);
		stream.end.mockImplementation(() =>
			queueMicrotask(() => stream.emit("error", new Error("boom"))),
		);
		const output = new OutputDocumentServer(Promise.resolve(stream));

		await expect(output.getBuffer()).rejects.toThrow("boom");
	});
});
