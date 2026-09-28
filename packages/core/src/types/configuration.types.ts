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
export type PdfAbortSignal = {
	readonly aborted: boolean;
	readonly reason?: unknown;
	addEventListener(
		type: "abort",
		listener: () => void,
		options?: { once?: boolean | undefined },
	): void;
	removeEventListener(type: "abort", listener: () => void): void;
};

/** Limits applied to each remote resource (fonts, images, files) downloaded for a document. */
export type ResourceLoadingOptions = {
	/** Milliseconds allowed for one resource, including redirects and the response body. */
	timeout?: number | undefined;
	/** Maximum size in bytes of one downloaded resource. */
	maxSize?: number | undefined;
};

export type PdfCraftOptions = {
	virtualfs?: VirtualFileSystem | undefined;
	resourceLoading?: ResourceLoadingOptions | undefined;
	fonts?: FontDescriptors | undefined;
	tableLayouts?: Dictionary<TableLayout> | undefined;
	progressCallback?: ((progress: number) => void) | undefined;
	urlAccessPolicy?: AccessPolicy | undefined;
	localAccessPolicy?: LocalAccessPolicy | undefined;
	extensions?: PdfCraftExtensions | undefined;
};

export type Options = PdfCraftOptions;

export type CreatePdfOptions = {
	progressCallback?: PdfCraftOptions["progressCallback"] | undefined;
	tableLayouts?: Dictionary<TableLayout> | undefined;
	fontLayoutCache?: boolean | undefined;
	bufferPages?: boolean | undefined;
	/** Overrides the instance resource limits for this document. */
	resourceLoading?: ResourceLoadingOptions | undefined;
	/** Aborting cancels outstanding resource downloads and rejects the document. */
	signal?: PdfAbortSignal | undefined;
};
