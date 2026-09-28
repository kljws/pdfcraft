import type { PdfPageInfo } from "../types";

export interface PdfDocumentStream {
	end(): void;
	setOpenActionAsPrint(): void;
	on(event: string, listener: (...args: unknown[]) => void): this;
	readonly pdfCraftPageInfo?: PdfPageInfo;
	/** Present on Node.js readable streams; `true` once someone consumes the data. */
	readonly readableFlowing?: boolean | null;
	readonly readableEnded?: boolean;
}

/**
 * Owns the generated PDF stream and defines who finalizes it.
 *
 * - The data methods (`getBuffer`, `getBase64`, `write`, …) finalize the stream themselves and
 *   share one collected result, so they can be called any number of times.
 * - `getStream()` hands the unfinalized stream to the caller. The caller may configure it (for
 *   example `setOpenActionAsPrint()`) and then either use the data methods, or consume the
 *   stream and call `end()` itself.
 * - Mixing is rejected when it cannot produce a complete PDF: collecting data after the caller
 *   started consuming or ended the stream, or taking the stream after collection started.
 * - A stream error is reported by the data methods even if it happened before they were called.
 */
class OutputDocument {
	private readonly pdfDocumentPromise: Promise<PdfDocumentStream>;
	private dataPromise: Promise<Uint8Array> | null = null;
	private endedByCaller = false;
	/** The stream's own `end`, kept when `getStream()` wraps it to notice a caller finalizing. */
	private libraryEnd: (() => void) | null = null;
	private streamError: { error: unknown } | null = null;
	private readonly observedStreams = new WeakSet<PdfDocumentStream>();

	constructor(pdfDocumentPromise: Promise<PdfDocumentStream>) {
		this.pdfDocumentPromise = pdfDocumentPromise.then((stream) => this.observe(stream));
		// Generation failures are reported by the method the caller awaits.
		this.pdfDocumentPromise.catch(() => undefined);
	}

	private observe(stream: PdfDocumentStream): PdfDocumentStream {
		if (!this.observedStreams.has(stream)) {
			this.observedStreams.add(stream);
			stream.on("error", (error) => {
				this.streamError ??= { error };
			});
		}
		return stream;
	}

	async getStream(): Promise<PdfDocumentStream> {
		const stream = await this.pdfDocumentPromise;
		if (this.dataPromise !== null) {
			throw new Error(
				"The PDF stream is no longer available: it was finalized by a data method such as getBuffer(). Call getStream() before them.",
			);
		}
		if (this.libraryEnd === null) {
			const end = stream.end.bind(stream);
			this.libraryEnd = end;
			stream.end = () => {
				this.endedByCaller = true;
				end();
			};
		}
		return stream;
	}

	/** Reports how many pages were written and whether `maxPagesNumber` omitted any. */
	async getPageInfo(): Promise<PdfPageInfo> {
		const stream = await this.pdfDocumentPromise;
		if (!stream.pdfCraftPageInfo) {
			throw new Error("Page information is not available for this stream");
		}
		return { ...stream.pdfCraftPageInfo };
	}

	protected getData(): Promise<Uint8Array> {
		if (this.dataPromise === null) {
			this.dataPromise = this.collectData();
		}
		return this.dataPromise;
	}

	private async collectData(): Promise<Uint8Array> {
		const stream = await this.pdfDocumentPromise;
		if (this.streamError) throw this.streamError.error;
		if (this.endedByCaller || stream.readableEnded || stream.readableFlowing === true) {
			throw new Error(
				"Cannot collect the PDF data: the stream returned by getStream() is already being consumed or was ended by the caller. Read the data from that stream instead.",
			);
		}

		return new Promise<Uint8Array>((resolve, reject) => {
			const chunks: Uint8Array[] = [];

			stream.on("data", (...args: unknown[]) => {
				const chunk = args[0];
				if (!(chunk instanceof Uint8Array)) {
					reject(new TypeError("PDF stream emitted a non-binary chunk"));
					return;
				}
				chunks.push(chunk);
			});
			stream.on("error", reject);
			stream.on("end", () => {
				const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
				const data = new Uint8Array(length);
				let offset = 0;
				for (const chunk of chunks) {
					data.set(chunk, offset);
					offset += chunk.byteLength;
				}
				resolve(data);
			});
			(this.libraryEnd ?? (() => stream.end()))();
		});
	}
}

export default OutputDocument;
