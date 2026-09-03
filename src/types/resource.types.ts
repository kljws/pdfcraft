import type { Dictionary } from "./common.types";

export type AccessPolicy = (resource: string) => boolean | Promise<boolean>;
export type LocalAccessPolicy = (resource: string) => boolean;
export interface HeaderCollection {
	forEach(callback: (value: string, key: string) => void): void;
}
export type ResourceHeaders =
	| Record<string, string>
	| ReadonlyArray<readonly [string, string]>
	| HeaderCollection;
export type VfsEncoding =
	| "ascii"
	| "base64"
	| "base64url"
	| "binary"
	| "hex"
	| "latin1"
	| "ucs2"
	| "ucs-2"
	| "utf8"
	| "utf-8"
	| "utf16le"
	| "utf-16le";

export interface ResourceReference {
	url: string;
	headers?: ResourceHeaders;
}

export type ResourceSource = string | ResourceReference;
export type FontSource = ResourceSource | [ResourceSource, string];

export interface FontDescriptor {
	normal: FontSource;
	bold?: FontSource;
	italics?: FontSource;
	bolditalics?: FontSource;
}

export type FontDescriptors = Dictionary<FontDescriptor>;

export interface VirtualFileSystem {
	existsSync(filename: string): boolean;
	readFileSync(
		filename: string,
		options?: VfsEncoding | { encoding?: VfsEncoding },
	): Uint8Array | string;
	writeFileSync(
		filename: string,
		content: string | ArrayBuffer | ArrayBufferView,
		options?: VfsEncoding | { encoding?: VfsEncoding },
	): void;
}
