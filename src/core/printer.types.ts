import type {
	CreatePdfOptions,
	Dictionary,
	DocumentDefinition,
	DynamicBackground,
	DynamicContent,
	FontDescriptors,
	Margin,
	PatternDefinition,
	PageOrientation,
	PageSize,
	PageSizeName,
	Style,
	TableLayout,
	ResourceReference,
	ResourceHeaders,
	DocumentPermissions,
} from "../types";
import type { PageMarginDefinition } from "../types/internal";
import type { DynamicPageMargins } from "../types/internal";

export type PrinterResourceReference = string | ResourceReference;

export interface AttachmentDefinition extends PDFKit.Mixins.PDFAttachmentOptions {
	src: PrinterResourceReference | Uint8Array;
	name?: string;
	description?: string;
}

export interface PrinterDocumentDefinition {
	content: DocumentDefinition["content"];
	version?: DocumentDefinition["version"];
	subset?: PDFKit.Mixins.PDFSubsets;
	tagged?: boolean;
	displayTitle?: boolean;
	images?: Dictionary<PrinterResourceReference>;
	svgs?: Dictionary<PrinterResourceReference>;
	attachments?: Dictionary<PrinterResourceReference | AttachmentDefinition>;
	files?: Dictionary<AttachmentDefinition>;
	patterns?: Dictionary<PatternDefinition>;
	pageSize?: PageSizeName | PageSize;
	pageMargins?: PageMarginDefinition | Margin | DynamicPageMargins;
	pageOrientation?: PageOrientation;
	styles?: Dictionary<Style>;
	defaultStyle?: Style;
	header?: DynamicContent;
	footer?: DynamicContent;
	background?: DynamicBackground;
	watermark?: DocumentDefinition["watermark"];
	pageBreakBefore?: DocumentDefinition["pageBreakBefore"];
	info?: Dictionary<string | Date>;
	compress?: boolean;
	userPassword?: string;
	ownerPassword?: string;
	permissions?: DocumentPermissions;
	language?: string;
	maxPagesNumber?: number;
}

export interface PrinterOptions extends CreatePdfOptions {
	fontLayoutCache?: boolean;
	bufferPages?: boolean;
	tableLayouts?: Dictionary<TableLayout>;
}

export type PdfKitCreationOptions = Omit<PDFKit.PDFDocumentOptions, "font" | "size"> & {
	size: [number, number];
	pdfVersion: NonNullable<DocumentDefinition["version"]>;
	bufferPages: boolean;
	autoFirstPage: boolean;
	font: null;
};

export type PrinterFontDescriptors = FontDescriptors;

export interface ExtendedResource {
	url: string;
	headers: ResourceHeaders;
}
