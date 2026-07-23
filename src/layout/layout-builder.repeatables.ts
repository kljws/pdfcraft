import type DocMeasure from "../measurement/doc-measure";
import type DocPreprocessor from "../preprocessing/doc-preprocessor";
import type PDFDocument from "../rendering/pdf-document";
import type { Style } from "../types";
import type { LayoutPdfNode, PageSize } from "../types/internal";
import { isString } from "../utils/variable-type";
import type PageElementWriter from "./element-writer.page";
import type {
	BackgroundGetter,
	DynamicNodeGetter,
	RepeatableSizeFunction,
	WatermarkDefinition,
} from "./layout-builder.types";
import { createWatermark } from "./layout-builder.watermark";

interface LayoutBuilderRepeatablesHost {
	writer: PageElementWriter;
	docPreprocessor: DocPreprocessor;
	docMeasure: DocMeasure;
	suppressLinearNodeList: boolean;
	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void;
}

class LayoutBuilderRepeatables {
	constructor(private readonly host: LayoutBuilderRepeatablesHost) {}

	private get writer(): PageElementWriter {
		return this.host.writer;
	}

	private get docPreprocessor(): DocPreprocessor {
		return this.host.docPreprocessor;
	}

	private get docMeasure(): DocMeasure {
		return this.host.docMeasure;
	}

	private processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void {
		this.host.processNode(node, isVerticalAlignmentAllowed);
	}

	private processRepeatableNode(node: LayoutPdfNode): void {
		const previous = this.host.suppressLinearNodeList;
		this.host.suppressLinearNodeList = true;
		try {
			this.processNode(node);
		} finally {
			this.host.suppressLinearNodeList = previous;
		}
	}

	addBackground(background: unknown): boolean {
		const dynamicBackgroundUsesPageCount =
			typeof background === "function" && background.length >= 3;
		const getBackground: BackgroundGetter =
			typeof background === "function" ? (background as BackgroundGetter) : () => background;
		const context = this.writer.context();
		const pageSize = context.getCurrentPage().pageSize;
		const pageBackground =
			typeof background === "function" && background.length === 2
				? (getBackground as (pageNumber: number, pageSize: PageSize) => unknown)(
						context.page + 1,
						pageSize,
					)
				: (getBackground as (pageNumber: number, pageCount: number, pageSize: PageSize) => unknown)(
						context.page + 1,
						context.pageCount,
						pageSize,
					);
		if (!pageBackground) return dynamicBackgroundUsesPageCount;

		this.writer.beginUnbreakableBlock(pageSize.width, pageSize.height);
		const processed = this.docPreprocessor.preprocessBlock(pageBackground);
		const measured = this.docMeasure.measureBlock(processed);
		const layoutNode = measured as LayoutPdfNode;
		this.processRepeatableNode(layoutNode);
		this.writer.commitUnbreakableBlock(0, 0);
		context.backgroundLength[context.page] += layoutNode.positions?.length ?? 0;
		return dynamicBackgroundUsesPageCount;
	}

	addDynamicRepeatable(
		nodeGetter: unknown,
		sizeFunction: RepeatableSizeFunction,
		customPropertyName: string,
	): void {
		const pages = this.writer.context().pages;
		for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
			this.writer.context().page = pageIndex;
			const customProperties = pages[pageIndex].customProperties;
			let pageNodeGetter = nodeGetter;
			if (customProperties[customPropertyName] || customProperties[customPropertyName] === null) {
				pageNodeGetter = customProperties[customPropertyName];
			}
			if (pageNodeGetter === undefined || pageNodeGetter === null) continue;

			const getNode: DynamicNodeGetter =
				typeof pageNodeGetter === "function"
					? (pageNodeGetter as DynamicNodeGetter)
					: () => pageNodeGetter;
			const node = getNode(pageIndex + 1, pages.length, pages[pageIndex].pageSize);
			if (!node) continue;

			const sizes = sizeFunction(pages[pageIndex].pageSize, pages[pageIndex].pageMargins);
			this.writer.beginUnbreakableBlock(sizes.width, sizes.height);
			const processed = this.docPreprocessor.preprocessBlock(node);
			const measured = this.docMeasure.measureBlock(processed);
			this.processRepeatableNode(measured as LayoutPdfNode);
			this.writer.commitUnbreakableBlock(sizes.x, sizes.y);
		}
	}

	addHeadersAndFooters(header: unknown, footer: unknown): void {
		this.addDynamicRepeatable(
			header,
			(pageSize, pageMargins) => ({
				x: 0,
				y: 0,
				width: pageSize.width,
				height: pageMargins.top,
			}),
			"header",
		);
		this.addDynamicRepeatable(
			footer,
			(pageSize, pageMargins) => ({
				x: 0,
				y: pageSize.height - pageMargins.bottom,
				width: pageSize.width,
				height: pageMargins.bottom,
			}),
			"footer",
		);
	}

	addWatermark(watermark: unknown, pdfDocument: PDFDocument, defaultStyle: Style): void {
		for (const page of this.writer.context().pages) {
			let pageWatermark = watermark;
			if (page.customProperties.watermark || page.customProperties.watermark === null) {
				pageWatermark = page.customProperties.watermark;
			}
			if (pageWatermark === undefined || pageWatermark === null) continue;
			if (isString(pageWatermark)) pageWatermark = { text: pageWatermark };
			if (
				pageWatermark === null ||
				typeof pageWatermark !== "object" ||
				!("text" in pageWatermark) ||
				!pageWatermark.text
			) {
				continue;
			}

			page.watermark = createWatermark(
				{ ...(pageWatermark as WatermarkDefinition) },
				page.pageSize,
				pdfDocument,
				defaultStyle,
			);
		}
	}
}

export default LayoutBuilderRepeatables;
