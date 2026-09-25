import type {
	LayoutPdfNode,
	PageMargins,
	PageSize,
	PdfPage,
	PreprocessedPdfNode,
} from "../../types/internal";

interface RepeatableSize {
	x: number;
	y: number;
	width: number;
	height: number;
}

type RepeatableSizeFunction = (pageSize: PageSize, pageMargins: PageMargins) => RepeatableSize;

type DynamicNodeGetter = (pageNumber: number, pageCount: number, pageSize: PageSize) => unknown;

interface HeaderFooterLayoutContext {
	pages: PdfPage[];
	setCurrentPage(pageIndex: number): void;
	beginUnbreakableBlock(width: number, height: number): void;
	commitUnbreakableBlock(
		forcedX: number,
		forcedY: number,
		detachedOverflowMessage?: string,
	): number | undefined;
	preprocessNode(node: unknown): PreprocessedPdfNode;
	measureNode(node: PreprocessedPdfNode): LayoutPdfNode;
	layoutNode(node: LayoutPdfNode): void;
}

const layoutDynamicRepeatable = (
	nodeGetter: unknown,
	sizeFunction: RepeatableSizeFunction,
	customPropertyName: "header" | "footer",
	autoHeight: boolean,
	context: HeaderFooterLayoutContext,
): Array<number | undefined> => {
	const measuredHeights: Array<number | undefined> = [];
	for (let pageIndex = 0; pageIndex < context.pages.length; pageIndex++) {
		context.setCurrentPage(pageIndex);
		const page = context.pages[pageIndex];
		const customProperties = page.customProperties;
		let pageNodeGetter = nodeGetter;
		if (customProperties[customPropertyName] || customProperties[customPropertyName] === null) {
			pageNodeGetter = customProperties[customPropertyName];
		}
		if (pageNodeGetter === undefined || pageNodeGetter === null) continue;

		const getNode: DynamicNodeGetter =
			typeof pageNodeGetter === "function"
				? (pageNodeGetter as DynamicNodeGetter)
				: () => pageNodeGetter;
		const node = getNode(pageIndex + 1, context.pages.length, page.pageSize);
		if (!node) continue;

		const sizes = sizeFunction(page.pageSize, page.pageMargins);
		context.beginUnbreakableBlock(sizes.width, autoHeight ? Infinity : sizes.height);
		const processed = context.preprocessNode(node);
		const measured = context.measureNode(processed);
		context.layoutNode(measured);
		const repeatableName = customPropertyName === "header" ? "Header" : "Footer";
		const measuredHeight = context.commitUnbreakableBlock(
			sizes.x,
			sizes.y,
			autoHeight
				? `${repeatableName} content on page ${pageIndex + 1} cannot span multiple pages.`
				: undefined,
		);
		measuredHeights[pageIndex] = measuredHeight;
		if (
			autoHeight &&
			measuredHeight !== undefined &&
			Number.isFinite(page.pageSize.height) &&
			measuredHeight >= page.pageSize.height - page.pageMargins.top
		) {
			throw new Error(
				`${repeatableName} content on page ${pageIndex + 1} is too tall to leave usable page content area.`,
			);
		}
	}
	return measuredHeights;
};

export const headerFooterFeature = {
	layout(
		header: unknown,
		footer: unknown,
		context: HeaderFooterLayoutContext,
	): Array<number | undefined> {
		layoutDynamicRepeatable(
			header,
			(pageSize, pageMargins) => ({
				x: 0,
				y: 0,
				width: pageSize.width,
				height: pageMargins.top,
			}),
			"header",
			false,
			context,
		);
		return layoutDynamicRepeatable(
			footer,
			(pageSize, pageMargins) => ({
				x: 0,
				y: pageSize.height - pageMargins.bottom,
				width: pageSize.width,
				height: pageMargins.bottom,
			}),
			"footer",
			true,
			context,
		);
	},
};
