import type { PageSizeDefinition } from "../../configuration/page-size";
import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutPdfNode, PageMarginSource } from "../../types/internal";
import { resolveSectionPage, type SectionNode } from "./resolve-section-page";
import type { LayoutSectionNode } from "./section.types";

export type SectionLayoutContext = {
	writer: PageElementWriter;
	defaultPageSize: PageSizeDefinition;
	defaultPageMargins: PageMarginSource;
	processNode(node: LayoutPdfNode): void;
};

export type SectionPageContext = Omit<SectionLayoutContext, "processNode">;

/**
 * Establishes the page a section starts on: a new page with the section's settings, unless the
 * current page is still empty. A container that frames the section calls it before measuring
 * its frame, so that the frame uses the section's page.
 */
export function prepareSectionPage(
	sectionNode: LayoutSectionNode,
	context: SectionPageContext,
): void {
	if (sectionNode._pagePrepared) return;
	sectionNode._pagePrepared = true;

	const section = sectionNode as SectionNode;
	const page = context.writer.context().getCurrentPage();
	if (!page || page.items.length > 0) {
		const writerContext = context.writer.context();
		const resolved = resolveSectionPage(section, page, {
			pageSize: context.defaultPageSize,
			pageMargins: context.defaultPageMargins,
			inheritedPageMargins: writerContext.basePageMargins[writerContext.page],
		});

		context.writer.addPage(
			resolved.pageSize,
			resolved.pageOrientation,
			resolved.pageMargins,
			resolved.customProperties,
		);
	}
}

export function layoutSection(sectionNode: LayoutSectionNode, context: SectionLayoutContext): void {
	prepareSectionPage(sectionNode, context);
	sectionNode._pagePrepared = false;
	context.processNode(sectionNode.section);
}
