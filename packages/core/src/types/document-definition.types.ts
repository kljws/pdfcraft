import type {
	Dictionary,
	Margin,
	PageOrientation,
	PageSize,
	PageSizeName,
	PdfSubset,
	ResolvedPageSize,
} from "./common.types";
import type { Content, DynamicBackground, DynamicContent, Style, Watermark } from "./content.types";
import type { ResourceSource } from "./resource.types";

export type AttachmentDefinition = {
	src: ResourceSource | Uint8Array;
	name?: string | undefined;
	type?: string | undefined;
	description?: string | undefined;
	hidden?: boolean | undefined;
	creationDate?: Date | undefined;
	modifiedDate?: Date | undefined;
	/** Relationship of the embedded file to the document (PDF/A-3 `AFRelationship`). */
	relationship?: "Alternative" | "Data" | "Source" | "Supplement" | "Unspecified" | undefined;
};

export type DocumentPermissions = {
	printing?: "lowResolution" | "highResolution" | undefined;
	modifying?: boolean | undefined;
	copying?: boolean | undefined;
	annotating?: boolean | undefined;
	fillingForms?: boolean | undefined;
	contentAccessibility?: boolean | undefined;
	documentAssembly?: boolean | undefined;
};

export type PatternDefinition = {
	boundingBox: [number, number, number, number];
	xStep: number;
	yStep: number;
	pattern: string;
	colored?: boolean | undefined;
};

export type DynamicPageMargins = (
	currentPage: number,
	pageCount: number,
	pageSize: ResolvedPageSize,
) => Margin;

declare global {
	interface PdfCraftDocumentExtensionRegistry {}
}

export type DocumentDefinition = PdfCraftDocumentExtensionRegistry & {
	content: Content;
	styles?: Dictionary<Style> | undefined;
	defaultStyle?: Style | undefined;
	pageSize?: PageSizeName | PageSize | undefined;
	pageOrientation?: PageOrientation | undefined;
	pageMargins?: Margin | DynamicPageMargins | undefined;
	header?: DynamicContent | undefined;
	footer?: DynamicContent | undefined;
	background?: DynamicBackground | undefined;
	watermark?: Watermark | undefined;
	images?: Dictionary<ResourceSource> | undefined;
	attachments?: Dictionary<ResourceSource | AttachmentDefinition> | undefined;
	files?: Dictionary<AttachmentDefinition> | undefined;
	patterns?: Dictionary<PatternDefinition> | undefined;
	info?: Dictionary<string | Date> | undefined;
	compress?: boolean | undefined;
	version?: "1.3" | "1.4" | "1.5" | "1.6" | "1.7" | "1.7ext3" | undefined;
	subset?: PdfSubset | undefined;
	tagged?: boolean | undefined;
	displayTitle?: boolean | undefined;
	userPassword?: string | undefined;
	ownerPassword?: string | undefined;
	permissions?: DocumentPermissions | undefined;
	language?: string | undefined;
	/**
	 * RDF descriptions (`<rdf:Description …>…</rdf:Description>`) added as-is to the document's XMP
	 * metadata packet, for example the Factur-X `fx:` properties and their PDF/A extension schema.
	 * Requires a PDF `version` other than 1.3, which has no XMP metadata stream.
	 */
	xmpMetadata?: string | readonly string[] | undefined;
	/**
	 * Writes only the first `maxPagesNumber` pages of the complete document (an excerpt). Layout,
	 * page totals (`pageCount` in headers and footers) and page references still describe the
	 * complete document. `getPageInfo()` on the output reports whether pages were omitted.
	 */
	maxPagesNumber?: number | undefined;
	pageBreakBefore?:
		| ((
				currentNode: Dictionary,
				followingNodesOnPage: readonly Dictionary[],
				nodesOnNextPage: readonly Dictionary[],
				previousNodesOnPage: readonly Dictionary[],
		  ) => boolean)
		| undefined;
};
