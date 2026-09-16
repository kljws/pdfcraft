import BaseLayoutBuilder from "../../src/layout/layout-builder.ts";
import StyleContextStack from "../../src/services/styles/style-context-stack.ts";
import type PDFDocument from "../../src/rendering/pdf-document.ts";
import type { Dictionary, PdfCraftExtension, Style } from "../../src/types/index.ts";
import type { PageBreakBefore } from "../../src/engine/page-break-before.types.ts";
import type {
	LineLike,
	PageControlItem,
	PageMargins,
	PageSize,
	PdfNode,
	PdfPage,
	TableLayout,
	Vector,
} from "../../src/types/internal.ts";

type RichPageItem = PdfNode &
	Vector &
	LineLike &
	PageControlItem & { x: number; y: number; r1: number };
interface RichPage extends Omit<PdfPage, "items"> {
	items: Array<{ type: "line"; item: RichPageItem }>;
}

const boxExtension: PdfCraftExtension = {
	name: "box",
	pageBreakKeys: ["box"],
	test: (node) => typeof node.box === "string",
	measure: (node, context) => {
		node.canvas = [{ type: "rect", x: 0, y: 0, w: 80, h: 80 }];
		context.measureBox({ width: 80, height: 80 });
	},
};

export class LayoutBuilder extends BaseLayoutBuilder {
	declare pages: RichPage[];
	declare context: Array<Record<string, number>>;
	declare styleStack: StyleContextStack;

	constructor(pageSize: PageSize, pageMargins: PageMargins) {
		super(pageSize, pageMargins, [boxExtension]);
	}

	override layoutDocument(
		docStructure: unknown,
		pdfDocument: unknown,
		styleDictionary: Dictionary<Style> = {},
		defaultStyle: Style | undefined = {},
		background?: unknown,
		header?: unknown,
		footer?: unknown,
		watermark?: unknown,
		pageBreakBefore?: unknown,
	): RichPage[] {
		return super.layoutDocument(
			docStructure,
			pdfDocument as PDFDocument,
			styleDictionary,
			defaultStyle ?? {},
			background,
			header,
			footer,
			watermark,
			pageBreakBefore as PageBreakBefore | undefined,
		) as unknown as RichPage[];
	}
}

export const sampleTestProvider = {
	images: {},
	provideFont: (_familyName: string, bold: boolean, italics: boolean) => ({
		widthOfString: (text: string, size: number) =>
			text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1),
		lineHeight: (size: number) => size,
		ascender: 150,
		descender: -50,
	}),
	provideImage: (_src: string) => ({ width: 1, height: 1 }),
};

export const emptyTableLayout: TableLayout = {
	defaultBorder: true,
	hLineWidth: () => 0,
	vLineWidth: () => 0,
	hLineColor: () => "black",
	vLineColor: () => "black",
	hLineStyle: () => null,
	vLineStyle: () => null,
	paddingLeft: () => 0,
	paddingRight: () => 0,
	paddingTop: () => 0,
	paddingBottom: () => 0,
};

export function createLayoutBuilder(): LayoutBuilder {
	const builder = new LayoutBuilder(
		{ width: 400, height: 800, orientation: "portrait" },
		{ left: 40, right: 40, top: 40, bottom: 40 },
	);
	builder.pages = [];
	builder.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
	builder.styleStack = new StyleContextStack();
	return builder;
}
