/**
 * Page counts of a generated document. `totalPageCount` is the length of the complete layout,
 * which page totals and page references describe; `pageCount` is the number of pages written
 * to the PDF. They differ only when `maxPagesNumber` truncated the output.
 */
export interface PdfPageInfo {
	pageCount: number;
	totalPageCount: number;
	truncated: boolean;
}

export interface OutputDocument {
	getStream(): Promise<unknown>;
	getPageInfo(): Promise<PdfPageInfo>;
	getBuffer(): Promise<Uint8Array>;
	getBase64(): Promise<string>;
	getDataUrl(): Promise<string>;
}

export interface OutputDocumentServer extends OutputDocument {
	getBuffer(): Promise<Uint8Array>;
	write(filename: string): Promise<void>;
}

export interface BrowserBlob {
	readonly size: number;
	readonly type: string;
	arrayBuffer(): Promise<ArrayBuffer>;
	slice(start?: number, end?: number, contentType?: string): BrowserBlob;
	text(): Promise<string>;
}

export interface BrowserWindow {
	location: { href: string };
	close(): void;
}

export interface OutputDocumentBrowser extends OutputDocument {
	getBlob(): Promise<BrowserBlob>;
	download(filename?: string): Promise<void>;
	open(win?: BrowserWindow | null): Promise<void>;
	print(win?: BrowserWindow | null): Promise<void>;
}
