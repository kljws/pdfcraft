import PDFDocument from "../../rendering/pdf-document.ts";
import sizes from "../../configuration/page-size.constants.ts";
import LayoutBuilder from "../../layout/layout-builder.ts";
import type { PageBreakBefore } from "../../engine/page-break-before.types.ts";
import type {
	Dictionary,
	FontDescriptors,
	PageOrientation,
	PageSizeName,
	PdfCraftExtensions,
	Style,
} from "../../types/index.ts";
import type { ResolvedAttachmentDefinition } from "../../rendering/renderer.types.ts";
import type { Inline, PageMarginSource, PageMargins } from "../../types/internal.ts";

type IntegrationDocumentDefinition = Record<string, unknown> & {
	content: unknown;
	pageOrientation?: string;
	images?: Dictionary<string>;
	attachments?: Dictionary<ResolvedAttachmentDefinition>;
	styles?: Dictionary<Style>;
	defaultStyle?: Style;
	pageMargins?: PageMarginSource | number[];
};

export type IntegrationRenderedItem = Record<string, unknown> & {
	type: string;
	x: number;
	y: number;
	x1: number;
	x2: number;
	y1: number;
	y2: number;
	width: number;
	height: number;
	maxWidth: number;
	_width: number;
	_height: number;
	color: unknown;
	inlines: Inline[];
	getWidth(): number;
};

export type IntegrationPage = {
	items: Array<{ type: string; item: IntegrationRenderedItem }>;
	pageSize: { width: number; height: number };
	pageMargins: PageMargins;
};

type InlineTextOptions = {
	page: number;
	item: number;
};

class IntegrationTestHelper {
	readonly margins = { top: 40, left: 40, right: 40, bottom: 40 };
	readonly lineHeight = 14.0625;
	readonly defaultBulletSpacer = "9. ";
	pdfDocument!: PDFDocument;

	constructor(private readonly extensions: PdfCraftExtensions = []) {}

	renderPages(
		sizeName: PageSizeName,
		docDefinition: IntegrationDocumentDefinition,
	): IntegrationPage[] {
		var size = sizes[sizeName];
		docDefinition.images = docDefinition.images || {};
		docDefinition.attachments = docDefinition.attachments || {};
		var fontDescriptors: FontDescriptors = {
			Roboto: {
				normal: "fonts/Roboto/Roboto-Regular.ttf",
				bold: "fonts/Roboto/Roboto-Medium.ttf",
				italics: "fonts/Roboto/Roboto-Italic.ttf",
				bolditalics: "fonts/Roboto/Roboto-MediumItalic.ttf",
			},
		};

		var pageSize: { width: number; height: number; orientation: PageOrientation } = {
			width: size[0],
			height: size[1],
			orientation: "portrait",
		};

		if (docDefinition.pageOrientation === "landscape") {
			pageSize = { width: size[1], height: size[0], orientation: "landscape" as const };
		}

		this.pdfDocument = new PDFDocument(
			fontDescriptors,
			docDefinition.images,
			{},
			docDefinition.attachments,
			{ size: [pageSize.width, pageSize.height], compress: false },
			null,
			undefined,
			docDefinition as unknown as Record<string, unknown>,
		);
		var builder = new LayoutBuilder(
			pageSize,
			(docDefinition.pageMargins as PageMarginSource | undefined) ?? {
				left: this.margins.left,
				right: this.margins.right,
				top: this.margins.top,
				bottom: this.margins.bottom,
			},
			this.extensions,
		);

		return builder.layoutDocument(
			docDefinition.content,
			this.pdfDocument,
			docDefinition.styles || {},
			docDefinition.defaultStyle || { fontSize: 12, font: "Roboto" },
			docDefinition.background,
			docDefinition.header,
			docDefinition.footer,
			docDefinition.watermark,
			docDefinition.pageBreakBefore as PageBreakBefore | undefined,
		) as unknown as IntegrationPage[];
	}

	getInlineTexts(pages: IntegrationPage[], options: InlineTextOptions): string[] {
		return pages[options.page].items[options.item].item.inlines.map((inline) => inline.text);
	}

	getWidthOfString(inlines: string): number {
		return this.pdfDocument.fontCache["Roboto"].normal!.widthOfString(inlines, 12);
	}
}

export default IntegrationTestHelper;
