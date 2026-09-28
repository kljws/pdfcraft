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
		const end = stream.end;
		const output = new OutputDocumentServer(Promise.resolve(stream));

		expect(await output.getStream()).toBe(stream);
		expect(await output.getBuffer()).toEqual(Buffer.from([1, 2, 3, 4]));
		expect(await output.getBase64()).toBe("AQIDBA==");
		expect(await output.getDataUrl()).toBe("data:application/pdf;base64,AQIDBA==");
		expect(end).toHaveBeenCalledOnce();
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
		const end = stream.end;
		end.mockImplementation(() => queueMicrotask(() => stream.emit("error", new Error("boom"))));
		const output = new OutputDocumentServer(Promise.resolve(stream));

		await expect(output.getBuffer()).rejects.toThrow("boom");
	});
});

class ReadableFakeStream extends FakeStream {
	readableFlowing: boolean | null = null;
	readableEnded = false;
}

describe("OutputDocument stream ownership", () => {
	it("lets the caller configure the stream before the data methods finalize it", async () => {
		const stream = new FakeStream([Uint8Array.from([1])]);
		const end = stream.end;
		const output = new OutputDocumentServer(Promise.resolve(stream));

		(await output.getStream()).setOpenActionAsPrint();
		expect(await output.getBuffer()).toEqual(Buffer.from([1]));
		expect(stream.setOpenActionAsPrint).toHaveBeenCalledOnce();
		expect(end).toHaveBeenCalledOnce();
	});

	it("rejects data collection after the caller ended the stream", async () => {
		const stream = new FakeStream([Uint8Array.from([1])]);
		const end = stream.end;
		const output = new OutputDocumentServer(Promise.resolve(stream));

		(await output.getStream()).end();
		await expect(output.getBuffer()).rejects.toThrow(
			"Cannot collect the PDF data: the stream returned by getStream() is already being consumed or was ended by the caller",
		);
		expect(end).toHaveBeenCalledOnce();
	});

	it("rejects data collection while the caller consumes the stream", async () => {
		const stream = new ReadableFakeStream([Uint8Array.from([1])]);
		const end = stream.end;
		const output = new OutputDocumentServer(Promise.resolve(stream));

		(await output.getStream()).on("data", () => undefined);
		stream.readableFlowing = true;
		await expect(output.getBuffer()).rejects.toThrow("already being consumed");
		expect(end).not.toHaveBeenCalled();
	});

	it("rejects taking the stream after the data methods finalized it", async () => {
		const stream = new FakeStream([Uint8Array.from([1])]);
		const output = new OutputDocumentServer(Promise.resolve(stream));

		await output.getBuffer();
		await expect(output.getStream()).rejects.toThrow("The PDF stream is no longer available");
	});

	it("reports a stream error that happened before data collection", async () => {
		const stream = new FakeStream([]);
		const output = new OutputDocumentServer(Promise.resolve(stream));
		await output.getPageInfo().catch(() => undefined);

		stream.emit("error", new Error("early failure"));
		await expect(output.getBuffer()).rejects.toThrow("early failure");
	});

	it("reports a document generation failure from every method", async () => {
		const output = new OutputDocumentServer(Promise.reject(new Error("layout failed")));
		await expect(output.getBuffer()).rejects.toThrow("layout failed");
		await expect(output.getStream()).rejects.toThrow("layout failed");
	});
});
