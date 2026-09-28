import type { Dictionary } from "./common.types";
import type { TableLayout } from "./content.types";
import type { PdfCraftExtensions } from "./extension.types";
import type {
	AccessPolicy,
	FontDescriptors,
	LocalAccessPolicy,
	VirtualFileSystem,
} from "./resource.types";

/**
 * The part of a standard `AbortSignal` that PDFCraft uses, declared structurally so the public
 * types need neither the DOM nor the Node.js library. Pass an `AbortController`'s `signal`.
 */
export interface PdfAbortSignal {
	readonly aborted: boolean;
	readonly reason?: unknown;
	addEventListener(type: "abort", listener: () => void, options?: { once?: boolean }): void;
	removeEventListener(type: "abort", listener: () => void): void;
}

/** Limits applied to each remote resource (fonts, images, files) downloaded for a document. */
export interface ResourceLoadingOptions {
	/** Milliseconds allowed for one resource, including redirects and the response body. */
	timeout?: number;
	/** Maximum size in bytes of one downloaded resource. */
	maxSize?: number;
}

export interface PdfCraftOptions {
	virtualfs?: VirtualFileSystem;
	resourceLoading?: ResourceLoadingOptions;
	fonts?: FontDescriptors;
	tableLayouts?: Dictionary<TableLayout>;
	progressCallback?: (progress: number) => void;
	urlAccessPolicy?: AccessPolicy;
	localAccessPolicy?: LocalAccessPolicy;
	extensions?: PdfCraftExtensions;
}

export type Options = PdfCraftOptions;

export interface CreatePdfOptions {
	progressCallback?: PdfCraftOptions["progressCallback"];
	tableLayouts?: Dictionary<TableLayout>;
	fontLayoutCache?: boolean;
	bufferPages?: boolean;
	/** Overrides the instance resource limits for this document. */
	resourceLoading?: ResourceLoadingOptions;
	/** Aborting cancels outstanding resource downloads and rejects the document. */
	signal?: PdfAbortSignal;
}
