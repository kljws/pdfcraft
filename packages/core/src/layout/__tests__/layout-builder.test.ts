import { assert, beforeEach, describe, it, vi } from "vitest";
import BaseLayoutBuilder from "../layout-builder.ts";
import StyleContextStack from "../../services/styles/style-context-stack.ts";
import type PDFDocument from "../../rendering/pdf-document.ts";
import type { Dictionary, PdfCraftExtension, Style } from "../../types/index.ts";
import type { PageBreakBefore } from "../../engine/page-break-before.types.ts";
import type {
	LineLike,
	PageControlItem,
	PageMargins,
	PageSize,
	PdfNode,
	PdfPage,
	TableLayout,
	Vector,
} from "../../types/internal.ts";

type RichPageItem = PdfNode &
	Vector &
	LineLike &
	PageControlItem & { x: number; y: number; r1: number };
interface RichPage extends Omit<PdfPage, "items"> {
	items: Array<{ type: "line"; item: RichPageItem }>;
}
type VerticalAlignmentFixture = PageControlItem & {
	isCellContentMultiPage: boolean;
	getNodeHeight(): number;
};

const boxExtension: PdfCraftExtension = {
	name: "box",
	pageBreakKeys: ["box"],
	test: (node) => typeof node.box === "string",
	measure: (node, context) => {
		node.canvas = [{ type: "rect", x: 0, y: 0, w: 80, h: 80 }];
		context.measureBox({ width: 80, height: 80 });
	},
};

class LayoutBuilder extends BaseLayoutBuilder {
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

// var TextInlines = pdfMake.TextInlines;
// var Block = pdfMake.Block;
// var BlockSet = pdfMake.BlockSet;
// var ColumnSet = pdfMake.ColumnSet;

function isArray(variable: unknown): boolean {
	return Array.isArray(variable);
}

function isObject(variable: unknown): boolean {
	return variable !== null && typeof variable === "object";
}

function toString(variable: unknown): string {
	if (variable === undefined) {
		return "undefined";
	} else if (variable === null) {
		return "null";
	} else {
		return String(variable);
	}
}

var sampleTestProvider = {
	images: {},
	provideFont: function (_familyName: string, bold: boolean, italics: boolean) {
		return {
			widthOfString: function (text: string, size: number) {
				return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
			},
			lineHeight: function (size: number) {
				return size;
			},
			ascender: 150,
			descender: -50,
		};
	},
	provideImage(_src: string) {
		return {
			width: 1,
			height: 1,
		};
	},
};

var emptyTableLayout: TableLayout = {
	defaultBorder: true,
	hLineWidth: function (i) {
		return 0;
	},
	vLineWidth: function (i) {
		return 0;
	},
	hLineColor: function (i) {
		return "black";
	},
	vLineColor: function (i) {
		return "black";
	},
	hLineStyle: function (i, node) {
		return null;
	},
	vLineStyle: function (i, node) {
		return null;
	},
	paddingLeft: function (i) {
		return 0;
	},
	paddingRight: function (i) {
		return 0;
	},
	paddingTop: function (i) {
		return 0;
	},
	paddingBottom: function (i) {
		return 0;
	},
};

describe("LayoutBuilder", function () {
	var builder: LayoutBuilder;

	beforeEach(function () {
		builder = new LayoutBuilder(
			{ width: 400, height: 800, orientation: "portrait" },
			{ left: 40, right: 40, top: 40, bottom: 40 },
		);
		builder.pages = [];
		builder.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
		builder.styleStack = new StyleContextStack();
	});

	describe("processDocument", function () {
		it("should arrange texts one below another", function () {
			var desc = ["first paragraph", "another paragraph"];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert(pages[0].items[0].item.y < pages[0].items[1].item.y);
			assert.equal(
				pages[0].items[0].item.y + pages[0].items[0].item.getHeight(),
				pages[0].items[1].item.y,
			);
		});

		it("should support text in nested object", function () {
			var desc = [
				{
					text: {
						text: {
							text: "hello, world",
						},
					},
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 1);
			assert.equal(pages[0].items[0].item.inlines.length, 2);
			assert.equal(pages[0].items[0].item.inlines[0].text, "hello, ");
			assert.equal(pages[0].items[0].item.inlines[1].text, "world");
		});

		it("calculates a positive vertical-alignment height when cell content spans pages", function () {
			const pages = builder.layoutDocument(
				[
					{
						table: {
							widths: [150, 150],
							body: {
								groups: [
									{
										rows: [
											[
												{
													text: Array.from({ length: 400 }, (_, index) => `line ${index}`).join(
														" ",
													),
													verticalAlignment: "middle",
												},
												{ text: "short", verticalAlignment: "bottom" },
											],
										],
									},
								],
								layout: emptyTableLayout,
							},
						},
					},
				],
				sampleTestProvider,
			);
			const pageItems = (pages as unknown as PdfPage[]).flatMap((page) => page.items);
			const begin = pageItems.find((item) => item.type === "beginVerticalAlignment");
			if (!begin?.item) throw new Error("Expected a vertical-alignment marker");
			const alignment = begin.item as VerticalAlignmentFixture;

			assert.ok(pages.length > 1);
			assert.equal(alignment.isCellContentMultiPage, true);
			assert.ok(Number.isFinite(alignment.getNodeHeight()));
			assert.ok(alignment.getNodeHeight() > 0);
		});

		it("should split lines with new-line character (bugfix)", function () {
			var desc = ["first paragraph\nhaving two lines", "another paragraph"];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 3);
		});

		it("should span text into lines if theres not enough horizontal space", function () {
			var desc = [
				"first paragraph",
				"another paragraph, this time a little bit longer though, we want to force this line to be broken into several lines",
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 6);
		});

		it("should respect maxHeight", function () {
			var desc = [
				{
					text: "another paragraph, this time a little bit longer though, we want to force this line to be broken into several lines",
					maxHeight: 15,
				},
			];
			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 1);
		});

		it("should add new pages when theres not enough space left on current page", function () {
			var desc = [
				"first paragraph",
				"another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block",
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 60);
			assert.equal(pages[1].items.length, 11);
		});

		it("should be able to add more than 1 page if there is not enough space", function () {
			var desc = [
				"first paragraph",
				"another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block",
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 3);
			assert.equal(pages[0].items.length, 60);
			assert.equal(pages[1].items.length, 60);
			assert.equal(pages[2].items.length, 21);
		});

		it("should not assume there is enough space left if line boundary is exactly on the page boundary (bugfix)", function () {
			var desc = [
				{
					fontSize: 72,
					stack: [
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
						{ text: "paragraph", noWrap: true },
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 2);
		});

		it("should support named styles", function () {
			var desc = [
				"paragraph",
				{
					text: "paragraph",
					style: "header",
					noWrap: true,
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

			assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
			assert.equal(pages[0].items[1].item.getWidth(), 9 * 70);
		});

		it("should support arrays of inlines (as an alternative to simple strings)", function () {
			var desc = [
				"paragraph",
				{
					text: ["paragraph ", "nextInline"],
					style: "header",
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 15 } });

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 2);
		});

		it("should support inline text in nested arrays", function () {
			var desc = [
				{
					text: [{ text: "a better " }, { text: [{ text: "style " }] }, { text: "independently " }],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { fontSize: 8 });

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 1);
			assert.equal(pages[0].items[0].item.inlines.length, 4);
			assert.equal(pages[0].items[0].item.inlines[0].text, "a ");
			assert.equal(pages[0].items[0].item.inlines[1].text, "better ");
			assert.equal(pages[0].items[0].item.inlines[2].text, "style ");
			assert.equal(pages[0].items[0].item.inlines[3].text, "independently ");
		});

		it("should support inline styling and style overrides", function () {
			var desc = [
				"paragraph",
				{
					text: [
						{ text: "paragraph", noWrap: true },
						{
							text: " paragraph",
							fontSize: 4,
						},
					],
					style: "header",
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

			assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
			assert.equal(pages[0].items[1].item.getWidth(), 9 * 70);
			assert.equal(pages[0].items[2].item.getWidth(), 9 * 4);
		});

		it("should support multiple styles (last property wins)", function () {
			var desc = ["paragraph", { text: "paragraph", style: ["header", "small"] }];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {
				header: { fontSize: 70 },
				small: { fontSize: 35 },
			});

			assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
			assert.equal(pages[0].items[1].item.getWidth(), 9 * 35);
		});

		it("should support style-overrides", function () {
			var desc = ["paragraph", { text: "paragraph", fontSize: 40, noWrap: true }];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

			assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
			assert.equal(pages[0].items[1].item.getWidth(), 9 * 40);
		});

		it("style-overrides should take precedence over named styles", function () {
			var desc = ["paragraph", { text: "paragraph", fontSize: 40, style: "header", noWrap: true }];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

			assert.equal(pages[0].items[1].item.getWidth(), 9 * 40);
		});

		it("should support default style", function () {
			var desc = ["text", "text2"];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { fontSize: 50 });
			assert.equal(pages[0].items[0].item.getWidth(), 4 * 50);
		});

		it("should support columns", function () {
			var desc = [
				{
					columns: [
						{
							text: "column 1",
						},
						{
							text: "column 2",
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 200);
		});

		it("should support fixed column widths", function () {
			var desc = [
				{
					columns: [
						{
							text: "col1",
							width: 100,
						},
						{
							text: "col2",
							width: 150,
						},
						{
							text: "col3",
							width: 90,
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 3);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 100);
			assert.equal(pages[0].items[2].item.x, 40 + 100 + 150);
		});

		it("should support text-only column definitions", function () {
			var desc = [
				{
					columns: ["column 1", "column 2"],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 200);
		});

		it("column descriptor should support named style inheritance", function () {
			var desc = [
				{
					style: "header",

					columns: [
						{
							text: "column 1",
						},
						{
							text: "column 2",
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 20 } });
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.getWidth(), 8 * 20);
			assert.equal(pages[0].items[1].item.getWidth(), 8 * 20);
		});

		it("column descriptor should support style overrides", function () {
			var desc = [
				{
					fontSize: 8,

					columns: [
						{
							text: "column 1",
						},
						{
							text: "column 2",
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 20 } });
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.getWidth(), 8 * 8);
		});

		it("should support column gap", function () {
			var desc = [
				{
					fontSize: 8,
					columnGap: 23,
					columns: [
						{ text: "column 1", width: 100 },
						{ text: "column 2", width: 100 },
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 100 + 23);
		});

		it("should support column gap inheritance", function () {
			var desc = [
				{
					fontSize: 8,
					columns: [
						{ text: "column 1", width: 100 },
						{ text: "column 2", width: 100 },
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { columnGap: 25 });
			assert.equal(pages[0].items[1].item.x, 40 + 100 + 25);
		});

		it("should support fixed column widths", function () {
			var desc = [
				{
					columns: [
						{
							text: "col1",
							width: 100,
						},
						{
							text: "col2",
							width: 150,
						},
						{
							text: "col3",
							width: 90,
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 3);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 100);
			assert.equal(pages[0].items[2].item.x, 40 + 100 + 150);
		});

		it("should support auto-width columns", function () {
			var desc = [
				{
					columns: [
						{
							text: "col1",
							width: "auto",
							noWrap: true,
						},
						{
							text: "column",
							width: "auto",
							noWrap: true,
						},
						{
							text: "col3",
							width: "auto",
							noWrap: true,
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 3);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 4 * 12);
			assert.equal(pages[0].items[2].item.x, 40 + 4 * 12 + 6 * 12);
		});

		it("should support auto-width columns mixed with other types of columns", function () {
			var desc = [
				{
					columns: [
						{
							text: "col1",
							width: "auto",
							noWrap: true,
						},
						{
							text: "column",
							width: 58,
							noWrap: true,
						},
						{
							text: "column",
							width: "*",
							noWrap: true,
						},
						{
							text: "column",
							width: "*",
							noWrap: true,
						},
						{
							text: "col3",
							width: "auto",
							noWrap: true,
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 5);

			var starWidth = (400 - 40 - 40 - 58 - 2 * 4 * 12) / 2;
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 4 * 12);
			assert.equal(pages[0].items[2].item.x, 40 + 4 * 12 + 58);
			assert.equal(pages[0].items[3].item.x, 40 + 4 * 12 + 58 + starWidth);
			assert.equal(pages[0].items[4].item.x, 40 + 4 * 12 + 58 + 2 * starWidth);
		});

		it("should support star columns and divide available width equally between all star columns", function () {
			var desc = [
				{
					columns: [
						{
							text: "col1",
						},
						{
							text: "col2",
							width: 50,
						},
						{
							text: "col3",
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			var pageSpace = 400 - 40 - 40;
			var starWidth = (pageSpace - 50) / 2;

			assert.equal(pages[0].items.length, 3);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + starWidth);
			assert.equal(pages[0].items[2].item.x, 40 + starWidth + 50);
		});

		it("should pass column widths to inner elements", function () {
			var desc = [
				{
					fontSize: 8,

					columns: [
						{
							columns: [
								{
									text: "sample text here, should have maxWidth set to ((400 - 40 - 40 - 50)/2)/2",
								},
								{
									text: "second column",
								},
							],
						},
						{
							text: "col2",
							width: 50,
						},
						{
							text: "col3",
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			// ((pageWidth - margins - fixed_column_width) / 2_columns) / 2_subcolumns
			var maxWidth = (400 - 40 - 40 - 50) / 2 / 2;
			assert.equal(pages[0].items[0].item.maxWidth, maxWidth);
		});

		it("should support stack of paragraphs", function () {
			var desc = [
				{
					stack: ["paragraph1", "paragraph2"],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert(pages[0].items[0].item.getHeight() > 0);
			assert.equal(pages[0].items.length, 2);
			assert.equal(
				pages[0].items[0].item.y + pages[0].items[0].item.getHeight(),
				pages[0].items[1].item.y,
			);
		});

		it("should apply an inherited paragraph gap between paragraphs", function () {
			const pages = builder.layoutDocument(
				[{ stack: ["paragraph1", "paragraph2"], paragraphGap: 15 }],
				sampleTestProvider,
			);

			const first = pages[0].items[0].item;
			const second = pages[0].items[1].item;
			assert.equal(second.y, first.y + first.getHeight() + 15);
		});

		it("should preserve the unconsumed top margin after a page break", function () {
			const pages = builder.layoutDocument(
				[
					{ image: "first", width: 1, height: 700 },
					{ text: "second", marginTop: 50 },
				],
				sampleTestProvider,
			);

			assert.equal(pages.length, 2);
			assert.equal(pages[1].items[0].item.y, 70);
		});

		it("should preserve the unconsumed bottom margin after a page break", function () {
			const pages = builder.layoutDocument(
				[{ image: "first", width: 1, height: 700, marginBottom: 50 }, { text: "second" }],
				sampleTestProvider,
			);

			assert.equal(pages.length, 2);
			assert.equal(pages[1].items[0].item.y, 70);
		});

		it("stack of paragraphs should inherit styles and overridden properties from column descriptors", function () {
			var desc = [
				{
					style: "header",
					italics: false,
					noWrap: true,
					columns: [
						{
							bold: true,
							stack: ["paragraph", { text: "paragraph2" }, { text: "paragraph3", bold: false }],
						},
						"another column",
						{
							text: "third column",
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {
				header: {
					italics: true,
					fontSize: 50,
				},
			});

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 5);
			assert.equal(pages[0].items[0].item.x, pages[0].items[1].item.x);
			assert.equal(pages[0].items[1].item.x, pages[0].items[2].item.x);

			assert.equal(pages[0].items[0].item.y, pages[0].items[3].item.y);
			assert.equal(pages[0].items[0].item.y, pages[0].items[4].item.y);

			assert.equal(pages[0].items[0].item.inlines[0].width, 9 * 50 * 1.5);
			assert.equal(pages[0].items[1].item.inlines[0].width, 10 * 50 * 1.5);

			assert.equal(pages[0].items[2].item.inlines[0].width, 10 * 50);
			assert.equal(pages[0].items[3].item.inlines[0].width, 14 * 50);
			assert.equal(pages[0].items[4].item.inlines[0].width, 12 * 50);
		});

		it("should support unordered lists", function () {
			var desc = [
				"paragraph",
				{
					ul: ["item 1", "item 2", "item 3"],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 7);
		});

		it("unordered lists should have circles to the left of each element", function () {
			var desc = [
				"paragraph",
				{
					ul: ["item 1", "item 2", "item 3"],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 7);

			for (var i = 1; i < 7; i += 2) {
				var circle = pages[0].items[i + 1].item; // circle is added after line
				var itemLine = pages[0].items[i].item;

				assert(circle.x < itemLine.x);
				assert(circle.y > itemLine.y && circle.y < itemLine.y + itemLine.getHeight());
			}
		});

		it("circle radius for unordered lists should be based on fontSize", function () {
			var desc = [
				{
					fontSize: 10,
					ul: ["item 1", "item 2", "item 3"],
				},
				{
					fontSize: 18,
					ul: ["item 1", "item 2", "item 3"],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			// without Math.toFixed an AssertionError occurs: 1.7999999999999998 == 1.8
			assert.equal(
				(pages[0].items[7].item.r1 / pages[0].items[1].item.r1).toFixed(1),
				(18 / 10).toFixed(1),
			);
		});

		it("unordered lists should support nested lists", function () {
			var desc = [
				{
					fontSize: 10,
					ul: [
						"item 1",
						{
							ul: ["subitem 1", "subitem 2", "subitem 3"],
						},
						"item 3",
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 10);

			// positioning
			assert.equal(pages[0].items[0].item.x, pages[0].items[8].item.x);
			assert.equal(pages[0].items[2].item.x, pages[0].items[4].item.x);
			assert(pages[0].items[0].item.x < pages[0].items[2].item.x);

			// circle positioning
			var circle = pages[0].items[3].item;
			var itemLine = pages[0].items[2].item;
			assert(circle.x < itemLine.x);
			assert(circle.y > itemLine.y && circle.y < itemLine.y + itemLine.getHeight());
		});

		it("if there is enough space left on the page for the circle but not enough for the following line of text, circle should be drawn on the next page, together with the text", function () {
			var desc = [
				{
					fontSize: 72,
					stack: [
						"paragraph",
						"paragraph",
						"paragraph",
						"paragraph",
						"paragraph",
						"paragraph",
						"paragraph",
						"paragraph",
						"paragraph",
					],
					noWrap: true,
				},
				{
					fontSize: 90,
					ul: [
						{
							text: [{ text: "line ", noWrap: true }, { text: "1" }],
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 9);
			assert.equal(pages[1].items.length, 3);
		});

		it("should support ordered lists", function () {
			var desc = [
				"paragraph",
				{
					ol: ["item 1", "item 2", "item 3"],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 4 + 3);
		});

		it("numbers in ordered list should use list style, not item-level style (bugfix)", function () {
			var desc = [
				{
					fontSize: 5,
					ol: [{ text: "item 1", fontSize: 15 }],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.inlines[0].fontSize, 15);
			assert.equal(pages[0].items[1].item.inlines[0].fontSize, 5);
		});

		it("numbers in ordered lists should be positioned to the left of each item", function () {
			var desc = [
				"paragraph",
				{
					ol: ["item 1", "item 2", "item 3"],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 4 + 3);

			for (var i = 0; i < 3; i++) {
				var itemLine = pages[0].items[1 + 2 * i].item;
				var numberLine = pages[0].items[2 + 2 * i].item;

				assert(numberLine.x < itemLine.x);
				assert(numberLine.x + numberLine.getWidth() <= itemLine.x);
				assert(numberLine.y >= itemLine.y && numberLine.y <= itemLine.y + itemLine.getHeight());
			}
		});

		it("numbers in ordered lists should be positioned to the left of each item also in more complex cases", function () {
			var desc = [
				"paragraph",
				{
					ol: [
						"item 1",
						{ fontSize: 40, text: "item 2" },
						{ text: ["item 3", { text: "next inline", fontSize: 30 }] },
						"item 4\nhaving two lines",
						{ text: ["item 5", { text: "next inline\nand next line", fontSize: 30 }] },
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);

			for (var i = 0; i < 3; i++) {
				var paragraphLine = pages[0].items[1 + 2 * i].item;
				var numberLine = pages[0].items[2 + 2 * i].item;

				assert(numberLine.x < paragraphLine.x);
				assert(numberLine.x + numberLine.getWidth() <= paragraphLine.x);
			}
		});

		it("numbers in ordered lists should be aligned (vertically) to the bottom of the first line of each item", function () {
			var desc = [
				"paragraph",
				{
					ol: [
						"item 1",
						{ fontSize: 40, text: "item 2" },
						{ text: ["item 3", { text: "next inline", fontSize: 30 }] },
						"item 4\nhaving two lines",
						{ text: ["item 5", { text: "next inline\nand next line", fontSize: 30 }] },
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);

			for (var i = 0; i < 3; i++) {
				var paragraphLine = pages[0].items[1 + 2 * i].item;
				var numberLine = pages[0].items[2 + 2 * i].item;

				assert.equal(
					numberLine.y + numberLine.getAscenderHeight(),
					paragraphLine.y + paragraphLine.getAscenderHeight(),
				);
			}
		});

		it("numbers in ordered list should be automatically incremented", function () {
			var desc = [
				{
					ol: ["item", "item", "item", "item"],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			for (var i = 0; i < 4; i++) {
				var numberLine = pages[0].items[1 + 2 * i].item;

				assert.equal(numberLine.inlines[0].text, (i + 1).toString() + ". ");
			}
		});

		it("numbers in ordered sublist should have independent counters", function () {
			var desc = [
				{
					ol: [
						"item 1",
						"item 2",
						{
							ol: ["subitem 1", "subitem 2", "subitem 3"],
						},
						"item 3",
						"item 4",
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			// item 2
			assert.equal(pages[0].items[3].item.inlines[0].text, "2. ");
			// item 3
			assert.equal(pages[0].items[3 + 6].item.inlines[0].text, "3. ");

			// subitem 1
			assert.equal(pages[0].items[5].item.inlines[0].text, "1. ");
			// subitem 2
			assert.equal(pages[0].items[7].item.inlines[0].text, "2. ");
		});

		it("ordered lists should not add an empty line below the number (bugfix)", function () {
			var desc = [
				{
					ol: ["item 1", "item 2"],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages[0].items[0].item.y, 40);
			assert.equal(pages[0].items[1].item.y, 40);
			assert.equal(pages[0].items[2].item.y, 40 + 12);
		});


		it("should throw an exception if unrecognized structure is detected", function () {
			assert.throws(function () {
				builder.layoutDocument([{ ol: ["item", { abc: "test" }] }], sampleTestProvider);
			});
		});

		it("should support a switch of page orientation within a document", function () {
			var desc = [
				{
					text: "Page 1, document orientation or default portrait",
				},
				{
					text: "Page 2, landscape",
					pageBreak: "before",
					pageOrientation: "landscape",
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].pageSize.orientation, "portrait");
			assert.equal(pages[1].pageSize.orientation, "landscape");
		});

		it("should support changing the page orientation to landscape consecutively", function () {
			var desc = [
				{
					text: "Page 1, document orientation or default portrait",
				},
				{
					text: "Page 2, landscape",
					pageBreak: "before",
					pageOrientation: "landscape",
				},
				{
					text: "Page 3, landscape again",
					pageBreak: "after",
					pageOrientation: "landscape",
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 3);
			assert.equal(pages[0].pageSize.orientation, "portrait");
			assert.equal(pages[1].pageSize.orientation, "landscape");
			assert.equal(pages[2].pageSize.orientation, "landscape");
		});

		it.each([
			["beforeOdd", 3],
			["beforeEven", 2],
			["afterOdd", 3],
			["afterEven", 2],
		] as const)("places content on the requested page parity for %s", function (pageBreak, page) {
			const isBefore = pageBreak.startsWith("before");
			const desc = isBefore
				? [{ text: "first" }, { text: "target", pageBreak }]
				: [{ text: "first", pageBreak }, { text: "target" }];

			const pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, page);
			assert.equal(pages[page - 1].items.length, 1);
		});

		it("should use the absolutePosition attribute to position in absolute coordinates", function () {
			var desc = [
				{
					columns: [
						{
							text: "text 1",
							absolutePosition: { x: 123, y: 200 },
						},
						{
							text: "text 2",
							absolutePosition: { x: 0, y: 0 },
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items[0].item.x, 123);
			assert.equal(pages[0].items[0].item.y, 200);
			assert.equal(pages[0].items[1].item.x, 0);
			assert.equal(pages[0].items[1].item.y, 0);
		});

		it("should use the absolutePosition attribute without pagebreak in canvas", function () {
			var builderAP = new LayoutBuilder(
				{ width: 841.89, height: 555.28, orientation: "portrait" },
				{ left: 40, right: 40, top: 40, bottom: 40 },
			);
			builderAP.pages = [];
			builderAP.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
			builderAP.styleStack = new StyleContextStack();
			var desc = [
				{
					absolutePosition: { x: 0, y: 0 },
					canvas: [
						{
							type: "polyline",
							lineWidth: 0,
							closePath: true,
							color: "#fce5d4",
							points: [
								{ x: 530, y: 0 },
								{ x: 650, y: 0 },
								{ x: 841.89, y: 50 },
								{ x: 841.89, y: 270 },
							],
						},
						{
							type: "polyline",
							lineWidth: 0,
							closePath: true,
							color: "#fce5d4",
							points: [
								{ x: 0, y: 400 },
								{ x: 300, y: 555.28 },
								{ x: 200, y: 555.28 },
								{ x: 0, y: 500 },
							],
						},
					],
				},
			];

			var pages = builderAP.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
		});

		it("should use the absolutePosition attribute without pagebreak in image", function () {
			var builderAP = new LayoutBuilder(
				{ width: 841.89, height: 555.28, orientation: "portrait" },
				{ left: 40, right: 40, top: 40, bottom: 40 },
			);
			builderAP.pages = [];
			builderAP.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
			builderAP.styleStack = new StyleContextStack();
			var desc = [
				{
					image: "sampleImage.jpg",
					width: 80,
					absolutePosition: { x: 250, y: 500 },
				},
				{
					image: "sampleImage.jpg",
					width: 80,
					absolutePosition: { x: 450, y: 520 },
				},
			];

			var pages = builderAP.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
		});

		it("should use the absolutePosition attribute without pagebreak in an extension", function () {
			var builderAP = new LayoutBuilder(
				{ width: 841.89, height: 555.28, orientation: "portrait" },
				{ left: 40, right: 40, top: 40, bottom: 40 },
			);
			builderAP.pages = [];
			builderAP.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
			builderAP.styleStack = new StyleContextStack();
			var desc = [
				{
					box: "first",
					absolutePosition: { x: 250, y: 500 },
				},
				{
					box: "second",
					absolutePosition: { x: 450, y: 520 },
				},
			];

			var pages = builderAP.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
		});

		it("should use the relativePosition attribute to position in relativePosition coordinates", function () {
			var desc = [
				{
					text: "text 1",
					relativePosition: { x: 123, y: 200 },
				},
				{
					text: "text 2",
					relativePosition: { x: 0, y: 0 },
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages[0].items[0].item.x, 163);
			assert.equal(pages[0].items[0].item.y, 240);
			assert.equal(pages[0].items[1].item.x, 40);
			assert.equal(pages[0].items[1].item.y, 40);
		});

		it("should use the relativePosition attribute to position in relativePosition coordinates in a table cell", function () {
			var desc = [
				{
					table: {
						widths: [200, 200],
						body: {
							groups: [
								{
									rows: [
										[
											{
												text: "text 1",
												style: {
													alignment: "center",
												},
												relativePosition: { x: 10, y: 200 },
											},
											{
												text: "text 2",
												relativePosition: { x: 0, y: 0 },
											},
										],
									],
								},
							],
							layout: emptyTableLayout,
						},
					},
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {});

			assert.equal(pages[0].items[0].item.x, 114);
			assert.equal(pages[0].items[0].item.y, 240);
			assert.equal(pages[0].items[1].item.x, 240);
			assert.equal(pages[0].items[1].item.y, 40);
		});

		it("should not break nodes across multiple pages when unbreakable attribute is passed", function () {
			var desc = [
				{
					stack: [
						{
							text: "first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, ",
						},
						{
							text: "beginning of another paragraph, this time long enough to be broken into several lines and then to break the containing blockanother paragraph, this time long enough to be broken into several lines and then to break the containing blockanother paragraph, this time long enough to be broken into several lines and then to break the containing blockanother paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block",
							unbreakable: true,
						},
					],
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 33);
			assert.equal(pages[1].items.length, 53);
		});

		it("should support wrap long word", function () {
			var desc = ["abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 3);
		});

		it("should support wrap long word with big font size", function () {
			var desc = [
				{
					text: "abc",
					fontSize: 200,
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 3);
		});

		it("should support wrap one big character with big font size", function () {
			var desc = [
				{
					text: "a",
					fontSize: 200,
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 1);
		});

		it("should support disable wrap long word by noWrap", function () {
			var desc = [
				{ text: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", noWrap: true },
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 1);
		});

		it("should support not line break if is text inlines (#975)", function () {
			var TEXT = [
				{ text: "Celestial Circle—" },
				{ text: "The Faithful Ally", style: "styled" },
				{ text: ", " },
				{ text: "Gift of Knowledge", style: "styled" },
				{ text: ", " },
				{ text: "Servant of Infallible Locations", style: "styled" },
				{ text: ", " },
				{ text: "Swift Spirit of Winged Transportation", style: "styled" },
				{ text: ", " },
				{ text: "Warding the Created Mind", style: "styled" },
			];

			var TEXT2 = [
				{ text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod " },
				{ text: "re" },
				{ text: "mark", style: "styled" },
				{ text: "able" },
			];

			var desc = [{ text: TEXT }, { text: TEXT2 }];

			var pages = builder.layoutDocument(
				desc,
				sampleTestProvider,
				{ styled: { color: "dodgerblue" } },
				{ fontSize: 16 },
			);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 16);
			assert.equal(pages[0].items[5].item.inlines.length, 3);
			assert.equal(pages[0].items[5].item.inlines[0].text, "Locations");
			assert.equal(pages[0].items[5].item.inlines[1].text, ", ");
			assert.equal(pages[0].items[5].item.inlines[2].text, "Swift ");

			assert.equal(pages[0].items[15].item.inlines.length, 3);
			assert.equal(pages[0].items[15].item.inlines[0].text, "re");
			assert.equal(pages[0].items[15].item.inlines[1].text, "mark");
			assert.equal(pages[0].items[15].item.inlines[2].text, "able");
		});

		it("should support line break if is text inlines and is new line", function () {
			var desc = [{ text: "First line.\n" }, { text: "Second line." }];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.inlines.length, 2);
			assert.equal(pages[0].items[0].item.inlines[0].text, "First ");
			assert.equal(pages[0].items[0].item.inlines[1].text, "line.");

			assert.equal(pages[0].items[1].item.inlines.length, 2);
			assert.equal(pages[0].items[1].item.inlines[0].text, "Second ");
			assert.equal(pages[0].items[1].item.inlines[1].text, "line.");
		});
	});





});
