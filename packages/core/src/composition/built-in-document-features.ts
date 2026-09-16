import type DocMeasure from "../measurement/doc-measure";
import type DocPreprocessor from "../preprocessing/doc-preprocessor";
import type PDFDocument from "../rendering/pdf-document";
import type { Style } from "../types";
import type { LayoutPdfNode } from "../types/internal";
import type PageElementWriter from "../layout/element-writer.page";
import { createWatermark } from "../features/repeatables/measure-watermark";
import { backgroundFeature } from "../features/repeatables/background.feature";
import { headerFooterFeature } from "../features/repeatables/header-footer.feature";
import { watermarkFeature } from "../features/repeatables/watermark.feature";

interface DocumentFeatureCompositionHost {
	writer: PageElementWriter;
	docPreprocessor: DocPreprocessor;
	docMeasure: DocMeasure;
	suppressLinearNodeList: boolean;
	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void;
}

export function createBuiltInDocumentFeatures(
	host: DocumentFeatureCompositionHost,
	pdfDocument: PDFDocument,
	defaultStyle: Style,
) {
	const layoutRepeatableNode = (node: LayoutPdfNode): void => {
		const previous = host.suppressLinearNodeList;
		host.suppressLinearNodeList = true;
		try {
			host.processNode(node);
		} finally {
			host.suppressLinearNodeList = previous;
		}
	};

	return {
		background: {
			layout(background: unknown): boolean {
				const context = host.writer.context();
				const pageSize = context.getCurrentPage().pageSize;
				return backgroundFeature.layout(background, {
					pageNumber: context.page + 1,
					pageCount: context.pageCount,
					pageSize,
					beginUnbreakableBlock: (width, height) =>
						host.writer.beginUnbreakableBlock(width, height),
					commitUnbreakableBlock: (forcedX, forcedY) =>
						host.writer.commitUnbreakableBlock(forcedX, forcedY),
					preprocessNode: (node) => host.docPreprocessor.preprocessBlock(node),
					measureNode: (node) => host.docMeasure.measureBlock(node) as LayoutPdfNode,
					layoutNode: layoutRepeatableNode,
					recordBackgroundItems: (count) => {
						context.backgroundLength[context.page] += count;
					},
				});
			},
		},
		headerFooter: {
			layout(header: unknown, footer: unknown): Array<number | undefined> {
				return headerFooterFeature.layout(header, footer, {
					pages: host.writer.context().pages,
					setCurrentPage: (pageIndex) => {
						host.writer.context().page = pageIndex;
					},
					beginUnbreakableBlock: (width, height) =>
						host.writer.beginUnbreakableBlock(width, height),
					commitUnbreakableBlock: (forcedX, forcedY, detachedOverflowMessage) =>
						host.writer.commitUnbreakableBlock(forcedX, forcedY, detachedOverflowMessage),
					preprocessNode: (node) => host.docPreprocessor.preprocessBlock(node),
					measureNode: (node) => host.docMeasure.measureBlock(node) as LayoutPdfNode,
					layoutNode: layoutRepeatableNode,
				});
			},
		},
		watermark: {
			layout(watermark: unknown): void {
				watermarkFeature.layout(watermark, {
					pages: host.writer.context().pages,
					measureWatermark: (definition, pageSize) =>
						createWatermark(definition, pageSize, pdfDocument, defaultStyle),
				});
			},
		},
	};
}
