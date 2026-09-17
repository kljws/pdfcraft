import type { PageSizeDefinition } from "../../configuration/page-size";
import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutPdfNode, PageMarginSource } from "../../types/internal";
import { resolveSectionPage, type SectionNode } from "./resolve-section-page";
import type { LayoutSectionNode } from "./section.types";

export interface SectionLayoutContext {
	writer: PageElementWriter;
	defaultPageSize: PageSizeDefinition;
	defaultPageMargins: PageMarginSource;
	processNode(node: LayoutPdfNode): void;
}

export function layoutSection(sectionNode: LayoutSectionNode, context: SectionLayoutContext): void {
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

	context.processNode(section.section);
}
