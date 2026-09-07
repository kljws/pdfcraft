export interface OutputDocument {
	getStream(): Promise<unknown>;
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
