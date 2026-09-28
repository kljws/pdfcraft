import type { Dictionary } from "./common.types";

export type AccessPolicy = (resource: string) => boolean | Promise<boolean>;
export type LocalAccessPolicy = (resource: string) => boolean;
export type HeaderCollection = {
	forEach(callback: (value: string, key: string) => void): void;
};
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

export type ResourceReference = {
	url: string;
	headers?: ResourceHeaders | undefined;
};

export type ResourceSource = string | ResourceReference;
export type FontSource = ResourceSource | [ResourceSource, string];

export type FontDescriptor = {
	normal: FontSource;
	bold?: FontSource | undefined;
	italics?: FontSource | undefined;
	bolditalics?: FontSource | undefined;
};

export type FontDescriptors = Dictionary<FontDescriptor>;

export type VirtualFileSystem = {
	existsSync(filename: string): boolean;
	readFileSync(
		filename: string,
		options?: VfsEncoding | { encoding?: VfsEncoding | undefined },
	): Uint8Array | string;
	writeFileSync(
		filename: string,
		content: string | ArrayBuffer | ArrayBufferView,
		options?: VfsEncoding | { encoding?: VfsEncoding | undefined },
	): void;
};
