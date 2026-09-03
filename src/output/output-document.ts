export interface PdfDocumentStream {
	end(): void;
	setOpenActionAsPrint(): void;
	on(event: string, listener: (...args: unknown[]) => void): this;
}

class OutputDocument {
	private readonly pdfDocumentPromise: Promise<PdfDocumentStream>;
	private dataPromise: Promise<Uint8Array> | null = null;

	constructor(pdfDocumentPromise: Promise<PdfDocumentStream>) {
		this.pdfDocumentPromise = pdfDocumentPromise;
	}

	getStream(): Promise<PdfDocumentStream> {
		return this.pdfDocumentPromise;
	}

	protected getData(): Promise<Uint8Array> {
		if (this.dataPromise === null) {
			this.dataPromise = this.collectData();
		}
		return this.dataPromise;
	}

	private async collectData(): Promise<Uint8Array> {
		const stream = await this.getStream();
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
			stream.end();
		});
	}
}

export default OutputDocument;
