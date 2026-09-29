import type { AllowUndefined } from "../utils/defined";
import type {
	CreatePdfOptions,
	Dictionary,
	DocumentDefinition,
	DynamicBackground,
	DynamicContent,
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

export type AttachmentDefinition = AllowUndefined<PDFKit.Mixins.PDFAttachmentOptions> & {
	src: PrinterResourceReference | Uint8Array;
};

export type PrinterDocumentDefinition = PdfCraftDocumentExtensionRegistry & {
	content: DocumentDefinition["content"];
	version?: DocumentDefinition["version"] | undefined;
	subset?: PDFKit.Mixins.PDFSubsets | undefined;
	tagged?: boolean | undefined;
	displayTitle?: boolean | undefined;
	images?: Dictionary<PrinterResourceReference> | undefined;
	attachments?: Dictionary<PrinterResourceReference | AttachmentDefinition> | undefined;
	files?: Dictionary<AttachmentDefinition> | undefined;
	patterns?: Dictionary<PatternDefinition> | undefined;
	pageSize?: PageSizeName | PageSize | undefined;
	pageMargins?: PageMarginDefinition | Margin | DynamicPageMargins | undefined;
	pageOrientation?: PageOrientation | undefined;
	styles?: Dictionary<Style> | undefined;
	defaultStyle?: Style | undefined;
	header?: DynamicContent | undefined;
	footer?: DynamicContent | undefined;
	background?: DynamicBackground | undefined;
	watermark?: DocumentDefinition["watermark"] | undefined;
	pageBreakBefore?: DocumentDefinition["pageBreakBefore"] | undefined;
	info?: Dictionary<string | Date> | undefined;
	compress?: boolean | undefined;
	userPassword?: string | undefined;
	ownerPassword?: string | undefined;
	permissions?: DocumentPermissions | undefined;
	language?: string | undefined;
	maxPagesNumber?: number | undefined;
	xmpMetadata?: DocumentDefinition["xmpMetadata"];
};

export type PrinterOptions = CreatePdfOptions & {
	fontLayoutCache?: boolean | undefined;
	bufferPages?: boolean | undefined;
	tableLayouts?: Dictionary<TableLayout> | undefined;
};

export type PdfKitCreationOptions = Omit<PDFKit.PDFDocumentOptions, "font" | "size"> & {
	size: [number, number];
	pdfVersion: NonNullable<DocumentDefinition["version"]>;
	bufferPages: boolean;
	autoFirstPage: boolean;
	font: null;
};

export type ExtendedResource = {
	url: string;
	headers: ResourceHeaders;
};
