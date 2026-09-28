/**
 * Page counts of a generated document. `totalPageCount` is the length of the complete layout,
 * which page totals and page references describe; `pageCount` is the number of pages written
 * to the PDF. They differ only when `maxPagesNumber` truncated the output.
 */
export type PdfPageInfo = {
	pageCount: number;
	totalPageCount: number;
	truncated: boolean;
};

export type OutputDocument = {
	getStream(): Promise<unknown>;
	getPageInfo(): Promise<PdfPageInfo>;
	getBuffer(): Promise<Uint8Array>;
	getBase64(): Promise<string>;
	getDataUrl(): Promise<string>;
};

export type OutputDocumentServer = OutputDocument & {
	getBuffer(): Promise<Uint8Array>;
	write(filename: string): Promise<void>;
};

export type BrowserBlob = {
	readonly size: number;
	readonly type: string;
	arrayBuffer(): Promise<ArrayBuffer>;
	slice(start?: number, end?: number, contentType?: string): BrowserBlob;
	text(): Promise<string>;
};

export type BrowserWindow = {
	location: { href: string };
	close(): void;
};

export type OutputDocumentBrowser = OutputDocument & {
	getBlob(): Promise<BrowserBlob>;
	download(filename?: string): Promise<void>;
	open(win?: BrowserWindow | null): Promise<void>;
	print(win?: BrowserWindow | null): Promise<void>;
};
