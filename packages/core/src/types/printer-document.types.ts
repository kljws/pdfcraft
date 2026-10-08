import type { AllowUndefined } from "../utils/defined";
import type {
	Dictionary,
	DocumentDefinition,
	DocumentPermissions,
	DynamicBackground,
	DynamicContent,
	Margin,
	PageOrientation,
	PageSize,
	PageSizeName,
	PatternDefinition,
	ResourceSource,
	Style,
} from "./index";
import type { DynamicPageMargins, PageMarginDefinition } from "./layout.types";

export type PrinterAttachmentDefinition = AllowUndefined<PDFKit.Mixins.PDFAttachmentOptions> & {
	src: ResourceSource | Uint8Array;
};

/**
 * Document definition as the printer processes it: orchestration fills its defaults, and features
 * resolve their resource references in place (`resolveResources`).
 */
export type PrinterDocumentDefinition = PdfCraftDocumentExtensionRegistry & {
	content: DocumentDefinition["content"];
	version?: DocumentDefinition["version"] | undefined;
	subset?: PDFKit.Mixins.PDFSubsets | undefined;
	tagged?: boolean | undefined;
	displayTitle?: boolean | undefined;
	images?: Dictionary<ResourceSource> | undefined;
	attachments?: Dictionary<ResourceSource | PrinterAttachmentDefinition> | undefined;
	files?: Dictionary<PrinterAttachmentDefinition> | undefined;
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
