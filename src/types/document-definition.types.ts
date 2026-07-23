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

export interface AttachmentDefinition {
	src: ResourceSource | Uint8Array;
	name?: string;
	type?: string;
	description?: string;
	hidden?: boolean;
	creationDate?: Date;
	modifiedDate?: Date;
}

export interface DocumentPermissions {
	printing?: "lowResolution" | "highResolution";
	modifying?: boolean;
	copying?: boolean;
	annotating?: boolean;
	fillingForms?: boolean;
	contentAccessibility?: boolean;
	documentAssembly?: boolean;
}

export interface PatternDefinition {
	boundingBox: [number, number, number, number];
	xStep: number;
	yStep: number;
	pattern: string;
	colored?: boolean;
}

export type DynamicPageMargins = (
	currentPage: number,
	pageCount: number,
	pageSize: ResolvedPageSize,
) => Margin;

export interface DocumentDefinition {
	content: Content;
	styles?: Dictionary<Style>;
	defaultStyle?: Style;
	pageSize?: PageSizeName | PageSize;
	pageOrientation?: PageOrientation;
	pageMargins?: Margin | DynamicPageMargins;
	header?: DynamicContent;
	footer?: DynamicContent;
	background?: DynamicBackground;
	watermark?: Watermark;
	images?: Dictionary<ResourceSource>;
	svgs?: Dictionary<ResourceSource>;
	attachments?: Dictionary<ResourceSource | AttachmentDefinition>;
	files?: Dictionary<AttachmentDefinition>;
	patterns?: Dictionary<PatternDefinition>;
	info?: Dictionary<string | Date>;
	compress?: boolean;
	version?: "1.3" | "1.4" | "1.5" | "1.6" | "1.7" | "1.7ext3";
	subset?: PdfSubset;
	tagged?: boolean;
	displayTitle?: boolean;
	userPassword?: string;
	ownerPassword?: string;
	permissions?: DocumentPermissions;
	language?: string;
	maxPagesNumber?: number;
	pageBreakBefore?: (
		currentNode: Dictionary,
		followingNodesOnPage: Dictionary[],
		nodesOnNextPage: Dictionary[],
		previousNodesOnPage: Dictionary[],
	) => boolean;
}
