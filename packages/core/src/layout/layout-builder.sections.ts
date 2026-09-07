import type { PageOrientation } from "../types";
import type { PageSizeDefinition } from "../configuration/page-size";
import type { LayoutPdfNode, PageMarginSource, PdfPage } from "../types/internal";
import type { PageMarginDefinition } from "../types/internal";
import { convertToDynamicContent } from "../utils/tools";

export type SectionNode = Omit<LayoutPdfNode, "background" | "pageOrientation"> & {
	section: LayoutPdfNode;
	pageSize?: PageSizeDefinition | "inherit";
	pageOrientation?: PageOrientation | "inherit";
	pageMargins?: PageMarginDefinition | "inherit";
	header?: unknown;
	footer?: unknown;
	background?: unknown;
	watermark?: unknown;
};

interface SectionDefaults {
	pageSize: PageSizeDefinition;
	pageMargins: PageMarginSource;
}

export function resolveSectionPage(
	section: SectionNode,
	currentPage: PdfPage | null,
	defaults: SectionDefaults,
): {
	pageSize: PageSizeDefinition;
	pageOrientation?: PageOrientation;
	pageMargins: PageMarginSource;
	customProperties: Record<string, unknown>;
} {
	const inheritedPageSize = currentPage
		? { width: currentPage.pageSize.width, height: currentPage.pageSize.height }
		: defaults.pageSize;
	const pageSize = section.pageSize === "inherit" ? inheritedPageSize : section.pageSize;
	const pageOrientation =
		section.pageOrientation === "inherit"
			? currentPage?.pageSize.orientation
			: section.pageOrientation;
	const pageMargins =
		section.pageMargins === "inherit"
			? (currentPage?.pageMargins ?? defaults.pageMargins)
			: section.pageMargins;

	const inheritedProperties = currentPage?.customProperties ?? {};
	const resolveProperty = (value: unknown, property: string): unknown =>
		value === "inherit" ? inheritedProperties[property] : value;
	const header = resolveProperty(section.header, "header");
	const footer = resolveProperty(section.footer, "footer");
	const background = resolveProperty(section.background, "background");
	const watermark = resolveProperty(section.watermark, "watermark");
	const customProperties: Record<string, unknown> = {};

	if (typeof header !== "undefined") {
		customProperties.header =
			header && typeof header !== "function" ? convertToDynamicContent(header) : header;
	}
	if (typeof footer !== "undefined") {
		customProperties.footer =
			footer && typeof footer !== "function" ? convertToDynamicContent(footer) : footer;
	}
	if (typeof background !== "undefined") customProperties.background = background;
	if (typeof watermark !== "undefined") customProperties.watermark = watermark;

	return {
		pageSize: pageSize ?? defaults.pageSize,
		pageOrientation,
		pageMargins: pageMargins ?? defaults.pageMargins,
		customProperties,
	};
}
