import { extensionFeature } from "../features/extension/extension.feature";
import { pageBreakBeforeFeature } from "../features/repeatables/page-break-before.feature";
import type { PageBreakBefore } from "../engine/page-break-before.types";
import DocumentContext from "../document/document-context";
import {
	runDocumentLayoutPipeline,
	type DocumentLayoutPassResult,
} from "../engine/document-layout-pipeline";
import PageElementWriter from "../layout/element-writer.page";
import { calculatePageHeight } from "../layout/page-item-geometry";
import DocMeasure from "../measurement/doc-measure";
import DocPreprocessor from "../preprocessing/doc-preprocessor";
import type PDFDocument from "../rendering/pdf-document";
import type { Dictionary, PdfCraftExtensions, Style } from "../types";
import type {
	LayoutPdfNode,
	MeasuredPdfNode,
	PageMarginSource,
	PageSize,
	PdfPage,
	TableLayout,
} from "../types/internal";
import { createBuiltInDocumentFeatures } from "./built-in-document-features";

export interface BuiltInDocumentPipelineContext {
	extensions: PdfCraftExtensions;
	pageBreakBefore?: PageBreakBefore;
	runPass(pageCount: number, bottomMarginOverrides: readonly number[]): DocumentLayoutPassResult;
}

export interface BuiltInDocumentProcessors {
	preprocessor: DocPreprocessor;
	measure: DocMeasure;
}

export interface BuiltInDocumentPassHost {
	readonly pageSize: PageSize;
	readonly pageMargins: PageMarginSource;
	docPreprocessor: DocPreprocessor;
	docMeasure: DocMeasure;
	linearNodeList: LayoutPdfNode[];
	suppressLinearNodeList: boolean;
	writer: PageElementWriter;
	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void;
}

export interface BuiltInDocumentPassInput {
	docStructure: unknown;
	pdfDocument: PDFDocument;
	defaultStyle: Style;
	background: unknown;
	header: unknown;
	footer: unknown;
	watermark: unknown;
	pageCount: number;
	bottomMarginOverrides: readonly number[];
	requiresFirstPage(document: LayoutPdfNode): boolean;
}

export function createBuiltInDocumentProcessors(
	pdfDocument: PDFDocument,
	styleDictionary: Dictionary<Style>,
	defaultStyle: Style,
	extensions: PdfCraftExtensions,
	tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>,
): BuiltInDocumentProcessors {
	return {
		preprocessor: new DocPreprocessor(extensions),
		measure: new DocMeasure(pdfDocument, styleDictionary, defaultStyle, extensions, tableLayouts),
	};
}

export function runBuiltInDocumentPipeline(context: BuiltInDocumentPipelineContext): PdfPage[] {
	return runDocumentLayoutPipeline({
		runPass: context.runPass,
		requiresPageBreakRelayout: (result) =>
			pageBreakBeforeFeature.addIfNecessary(
				result.linearNodeList,
				result.pages,
				context.pageBreakBefore,
				{
					copyExtensionProperties: (node, nodeInfo) =>
						extensionFeature.copyPageBreakProperties(node, nodeInfo, context.extensions),
				},
			),
	});
}

export function runBuiltInDocumentPass(
	host: BuiltInDocumentPassHost,
	input: BuiltInDocumentPassInput,
): DocumentLayoutPassResult {
	host.linearNodeList = [];
	const processedDocument = host.docPreprocessor.preprocessDocument(input.docStructure);
	const layoutDocument = host.docMeasure.measureDocument(processedDocument) as LayoutPdfNode;

	const documentContext = new DocumentContext();
	documentContext.pageMarginSource = host.pageMargins;
	documentContext.pageCount = input.pageCount;
	documentContext.bottomMarginOverrides = input.bottomMarginOverrides;
	host.writer = new PageElementWriter(documentContext);
	const documentFeatures = createBuiltInDocumentFeatures(
		host,
		input.pdfDocument,
		input.defaultStyle,
	);
	let dynamicBackgroundUsesPageCount = false;

	// Backgrounds observe the estimated page count while repeatables added after body
	// layout observe the completed pages array.
	host.writer.context().addListener("pageAdded", (page: PdfPage) => {
		let background = input.background;
		if (page.customProperties["background"] || page.customProperties["background"] === null) {
			background = page.customProperties["background"];
		}

		dynamicBackgroundUsesPageCount =
			documentFeatures.background.layout(background) || dynamicBackgroundUsesPageCount;
	});

	if (input.requiresFirstPage(layoutDocument)) {
		host.writer.addPage(host.pageSize, null, host.pageMargins);
	}

	host.processNode(layoutDocument);
	for (const page of host.writer.context().pages) {
		if (page.pageSize.height === Infinity) {
			page.pageSize = {
				...page.pageSize,
				height: calculatePageHeight(page, page.pageMargins),
			};
		}
	}
	const footerHeights = documentFeatures.headerFooter.layout(input.header, input.footer);
	documentFeatures.watermark.layout(input.watermark);

	return {
		pages: host.writer.context().pages,
		linearNodeList: host.linearNodeList,
		pageMarginFunctionUsed: host.writer.context().pageMarginFunctionUsed,
		dynamicBackgroundUsesPageCount,
		basePageMargins: host.writer.context().basePageMargins,
		footerHeights,
	};
}
