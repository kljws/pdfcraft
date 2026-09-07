import type { Dictionary } from "./common.types";
import type { TableLayout } from "./content.types";
import type { PdfCraftExtensions } from "./extension.types";
import type {
	AccessPolicy,
	FontDescriptors,
	LocalAccessPolicy,
	VirtualFileSystem,
} from "./resource.types";

export interface PdfCraftOptions {
	virtualfs?: VirtualFileSystem;
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
}
