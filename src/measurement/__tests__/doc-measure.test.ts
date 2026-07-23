import { assert, beforeEach, describe, it } from "vitest";
import BaseDocPreprocessor from "../../preprocessing/doc-preprocessor.ts";
import BaseDocMeasure from "../doc-measure.ts";
import type PDFDocument from "../../rendering/pdf-document.ts";
import SVGMeasure from "../svg-measure.ts";
import type TextInlines from "../../text/text-inlines.ts";
import type { Dictionary, Style } from "../../types/index.ts";
import type {
	ColumnNode,
	ColumnWidth,
	MeasuredPdfNode,
	PdfFont,
	PdfNode,
	PdfTable,
	PreprocessedPdfNode,
	TableLayout,
} from "../../types/internal.ts";

interface MeasuredFixture extends PdfNode {
	_minWidth: number;
	_maxWidth: number;
	_gapSize: NonNullable<PdfNode["_gapSize"]>;
	columns: Array<ColumnNode & MeasuredFixture>;
	stack: MeasuredFixture[];
	ul: MeasuredFixture[];
	ol: MeasuredFixture[];
	table: PdfTable & { body: MeasuredFixture[][] };
}

interface FixtureTableBody extends Array<MeasuredFixture[]> {
	push(...items: unknown[][]): number;
}

interface TableNodeFixture extends Omit<PdfNode, "layout" | "table"> {
	layout?: Partial<TableLayout>;
	table: Omit<PdfTable, "body" | "widths"> & {
		body: FixtureTableBody;
		widths: ColumnWidth[];
		headerLines?: number;
	};
}

const measured = (node: MeasuredPdfNode): MeasuredFixture => node as MeasuredFixture;

class DocPreprocessor extends BaseDocPreprocessor {
	override preprocessColumns(node: unknown): PreprocessedPdfNode {
		return super.preprocessColumns(node as PreprocessedPdfNode);
	}

	override preprocessVerticalContainer(
		node: unknown,
		isSectionAllowed = false,
	): PreprocessedPdfNode {
		return super.preprocessVerticalContainer(node as PreprocessedPdfNode, isSectionAllowed);
	}

	override preprocessList(node: unknown): PreprocessedPdfNode {
		return super.preprocessList(node as PreprocessedPdfNode);
	}

	override preprocessTable(node: unknown): PreprocessedPdfNode {
		return super.preprocessTable(node as PreprocessedPdfNode);
	}

	override preprocessText(node: unknown): PreprocessedPdfNode {
		return super.preprocessText(node as PreprocessedPdfNode);
	}
}

class DocMeasure extends BaseDocMeasure {
	constructor(
		pdfDocument: unknown,
		styleDictionary: Dictionary<Style> = {},
		defaultStyle: Style = {},
		svgMeasure?: SVGMeasure,
		tableLayouts: Dictionary<Partial<TableLayout>> = {},
	) {
		super(
			pdfDocument as PDFDocument,
			styleDictionary,
			defaultStyle,
			svgMeasure as SVGMeasure,
			tableLayouts,
		);
	}

	override measureLeaf(node: unknown): MeasuredFixture {
		return measured(super.measureLeaf(node as MeasuredPdfNode));
	}

	measureColumns(node: unknown): MeasuredFixture {
		return measured(this.containers.measureColumns(node as MeasuredPdfNode));
	}

	measureVerticalContainer(node: unknown): MeasuredFixture {
		return measured(this.containers.measureVerticalContainer(node as MeasuredPdfNode));
	}

	measureUnorderedList(node: unknown): MeasuredFixture {
		return measured(this.containers.measureUnorderedList(node as MeasuredPdfNode));
	}

	measureOrderedList(node: unknown): MeasuredFixture {
		return measured(this.containers.measureOrderedList(node as MeasuredPdfNode));
	}

	override measureTable(node: unknown): MeasuredFixture {
		return measured(super.measureTable(node as MeasuredPdfNode));
	}

	override measureDocument(node: unknown): MeasuredFixture {
		return measured(super.measureDocument(node as PreprocessedPdfNode));
	}

	measureImageWithDimensions(
		node: unknown,
		dimensions: { width: number; height: number },
	): MeasuredFixture {
		return measured(this.media.measureImageWithDimensions(node as MeasuredPdfNode, dimensions));
	}

	convertIfInlineImage(node: MeasuredPdfNode): void {
		this.media.convertIfInlineImage(node);
	}

	measureSVG(node: MeasuredPdfNode): MeasuredFixture {
		return measured(this.media.measureSVG(node));
	}
}

var sampleTestProvider = {
	provideFont: function (_familyName: string, bold: boolean, italics: boolean): PdfFont {
		return {
			ascender: 0,
			descender: 0,
			widthOfString: function (text: string, size: number) {
				return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
			},
			lineHeight: function (size: number) {
				return size;
			},
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

var docMeasure = new DocMeasure(sampleTestProvider);
var docPreprocessor = new DocPreprocessor();

describe("DocMeasure", function () {
	describe("measureLeaf", function () {
		it("should call textInlines.buildInlines and set _inlines, _minWidth, _maxWidth and return node", function () {
			var dm = new DocMeasure(sampleTestProvider);
			var called = false;
			var node = { text: "abc" };

			(dm as unknown as { textInlines: TextInlines }).textInlines = {
				buildInlines: function () {
					called = true;
					return { items: ["abc"], minWidth: 1, maxWidth: 10 };
				},
			} as unknown as TextInlines;

			docPreprocessor.preprocessText(node);
			var result = dm.measureLeaf(node);
			assert(called);
			assert(result._inlines);
			assert(result._minWidth);
			assert(result._maxWidth);

			assert.equal(result._inlines.length, 1);
			assert.equal(result._minWidth, 1);
			assert.equal(result._maxWidth, 10);

			assert.strictEqual(result, node as unknown as MeasuredFixture);
		});
	});

	describe("measureColumns", function () {
		it("should extend document-definition-object if text columns are used", function () {
			var node = { columns: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessColumns(node);
			var result = docMeasure.measureColumns(node);

			assert(result.columns[0]._minWidth);
			assert(result.columns[0]._maxWidth);
		});

		it("should calculate _minWidth and _maxWidth of all columns", function () {
			var node = { columns: ["this is a test", "another one"] };
			docPreprocessor.preprocessColumns(node);
			var result = docMeasure.measureColumns(node);

			assert.equal(result.columns[0]._minWidth, 4 * 12);
			assert.equal(result.columns[0]._maxWidth, 14 * 12);
			assert.equal(result.columns[1]._minWidth, 7 * 12);
			assert.equal(result.columns[1]._maxWidth, 11 * 12);
		});

		it("should set _minWidth and _maxWidth to the sum of inner min/max widths", function () {
			var node = {
				columns: [
					{ text: "this is a test", width: "auto" },
					{ text: "another one", width: "auto" },
				],
				columnGap: 0,
			};
			docPreprocessor.preprocessColumns(node);
			var result = docMeasure.measureColumns(node);

			assert.equal(result._minWidth, 4 * 12 + 7 * 12);
			assert.equal(result._maxWidth, 14 * 12 + 11 * 12);
		});

		it("should set _minWidth and _maxWidth properly when star columns are defined", function () {
			var node = { columns: ["this is a test", "another one"], columnGap: 0 };
			docPreprocessor.preprocessColumns(node);
			var result = docMeasure.measureColumns(node);

			assert.equal(result._minWidth, 7 * 12 + 7 * 12);
			assert.equal(result._maxWidth, 14 * 12 + 14 * 12);
		});
	});

	describe("measureVerticalContainer", function () {
		it("should extend document-definition-object if text paragraphs are used", function () {
			var node = { stack: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessVerticalContainer(node);
			var result = docMeasure.measureVerticalContainer(node);

			assert(result.stack[0]._minWidth);
			assert(result.stack[0]._maxWidth);
		});

		it("should calculate _minWidth and _maxWidth of all elements", function () {
			var node = { stack: ["this is a test", "another one"] };
			docPreprocessor.preprocessVerticalContainer(node);
			var result = docMeasure.measureVerticalContainer(node);

			assert.equal(result.stack[0]._minWidth, 4 * 12);
			assert.equal(result.stack[0]._maxWidth, 14 * 12);
			assert.equal(result.stack[1]._minWidth, 7 * 12);
			assert.equal(result.stack[1]._maxWidth, 11 * 12);
		});

		it("should set _minWidth and _maxWidth to the max of inner min/max widths", function () {
			var node = { stack: ["this is a test", "another one"] };
			docPreprocessor.preprocessVerticalContainer(node);
			var result = docMeasure.measureVerticalContainer(node);

			assert.equal(result._minWidth, 7 * 12);
			assert.equal(result._maxWidth, 14 * 12);
		});
	});

	describe("measureUnorderedList", function () {
		it("should extend document-definition-object if text items are used", function () {
			var node = { ul: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessList(node);
			var result = docMeasure.measureUnorderedList(node);

			assert(result.ul[0]._minWidth);
			assert(result.ul[0]._maxWidth);

			assert(result._gapSize);
		});
	});

	describe("measureOrderedList", function () {
		it("should extend document-definition-object if text items are used", function () {
			var node = { ol: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessList(node);
			var result = docMeasure.measureOrderedList(node);

			assert(result.ol[0]._minWidth);
			assert(result.ol[0]._maxWidth);

			assert(result._gapSize);
		});

		it("should not increase listMarker when list item is a nested list", function () {
			var node = {
				ol: ["parent item 1", { ol: ["nested item 1", "nested item 2"] }, "parent item 2"],
			};
			docPreprocessor.preprocessList(node);
			var result = docMeasure.measureOrderedList(node);

			assert.equal(result.ol[2].listMarker!._inlines![0].text, "2. ");
		});

		it("should calculate _minWidth and _maxWidth of all elements", function () {
			var node = { ol: ["this is a test", "another one"] };
			docPreprocessor.preprocessList(node);
			var result = docMeasure.measureOrderedList(node);

			assert.equal(result.ol[0]._minWidth, 4 * 12);
			assert.equal(result.ol[0]._maxWidth, 14 * 12);
			assert.equal(result.ol[1]._minWidth, 7 * 12);
			assert.equal(result.ol[1]._maxWidth, 11 * 12);
		});

		it("should set _minWidth and _maxWidth to the max of inner min/max widths + gapSize", function () {
			var node = { ol: ["this is a test", "another one"] };
			docPreprocessor.preprocessList(node);
			var result = docMeasure.measureOrderedList(node);

			assert.strictEqual(result, node as unknown as MeasuredFixture);
			assert(result._gapSize.width > 0);
			assert.equal(result._minWidth, 7 * 12 + result._gapSize.width);
			assert.equal(result._maxWidth, 14 * 12 + result._gapSize.width);
		});
	});

	describe("measureTable", function () {
		var tableNode: TableNodeFixture;

		beforeEach(function () {
			tableNode = {
				table: {
					headerLines: 1,
					widths: ["*", 150, "auto", "auto"],
					body: [
						["Header 1", "H2", "Header\nwith\nlines", { text: "last", fontSize: 20 }],
						["Column 1", "Column 2", "Column 3", "Column 4"],
						[
							"A text in the first column",
							"Text in the second one",
							"Other things go here",
							"or here",
						],
					],
				},
				layout: {
					vLineWidth: function () {
						return 0;
					},
					hLineWidth: function () {
						return 0;
					},
					paddingLeft: function () {
						return 0;
					},
					paddingRight: function () {
						return 0;
					},
				},
			} as unknown as TableNodeFixture;
		});

		it("should extend document-definition-object", function () {
			docPreprocessor.preprocessTable(tableNode);
			var result = docMeasure.measureTable(tableNode);

			assert(result.table.body[0][0]._minWidth);
			assert(result.table.body[0][0]._maxWidth);
			assert(result.table.body[0][3]._minWidth);
			assert(result.table.body[0][3]._maxWidth);
			assert(result.table.widths[0]._maxWidth);
			assert(result.table.widths[0]._minWidth);
			assert(result.table.widths[0].width);
		});

		it("inherits table-cell borders and fills from named styles", function () {
			const styledMeasure = new DocMeasure(sampleTestProvider, {
				cell: {
					border: [true, false, true, false],
					borderColor: ["red", "green", "blue", "black"],
					fillColor: "yellow",
					fillOpacity: 0.5,
				},
			});
			const node = {
				table: { body: [[{ text: "Styled", style: "cell" }]] },
			};

			docPreprocessor.preprocessTable(node);
			const cell = styledMeasure.measureTable(node).table.body[0][0];

			assert.deepEqual(cell.border, [true, false, true, false]);
			assert.deepEqual(cell.borderColor, ["red", "green", "blue", "black"]);
			assert.equal(cell.fillColor, "yellow");
			assert.equal(cell.fillOpacity, 0.5);
		});

		it("should not spoil widths if measureTable has been called before", function () {
			docPreprocessor.preprocessTable(tableNode);
			var result = docMeasure.measureTable(tableNode);
			result = docMeasure.measureTable(result);

			assert(result.table.widths[0]._maxWidth);
			assert(result.table.widths[0]._minWidth);
			assert(result.table.widths[0].width);
			assert.equal(result.table.widths[0].width, "*");
		});

		it("should calculate _minWidth and _maxWidth for all columns", function () {
			docPreprocessor.preprocessTable(tableNode);
			var result = docMeasure.measureTable(tableNode);

			result.table.widths.forEach(function (width) {
				assert(width._maxWidth);
				assert(width._minWidth);
				assert(width.width);
			});
		});

		it("should set _minWidth and _maxWidth of each column to min/max width or the largest cell", function () {
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);

			assert.equal(tableNode.table.widths[0]._minWidth, 6 * 12);
			assert.equal(tableNode.table.widths[0]._maxWidth, 26 * 12);
		});

		it("should support single-width-definition and extend it to an array of widths", function () {
			var node = {
				table: {
					headerLines: 1,
					widths: "auto",
					body: [
						["Header 1", "H2", "Header\nwith\nlines", { text: "last", fontSize: 20 }],
						["Column 1", "Column 2", "Column 3", "Column 4"],
						[
							"A text in the first column",
							"Text in the second one",
							"Other things go here",
							"or here",
						],
					],
				},
			};

			docPreprocessor.preprocessTable(node);
			var result = docMeasure.measureTable(node);

			assert(result.table.widths instanceof Array);
			assert.equal(result.table.widths.length, 4);
			result.table.widths.forEach(function (w) {
				assert.equal(w.width, "auto");
			});
		});

		it("should set _minWidth and _maxWidth to the sum of column min/max widths", function () {
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);

			assert.equal(tableNode._minWidth, 150 + 6 * 12 + 6 * 12 + 4 * 20);
			assert.equal(tableNode._maxWidth, 798);
		});

		it("should support column spans", function () {
			tableNode.table.body.push([{ text: "Column 1", colSpan: 2 }, {}, "Column 3", "Column 4"]);

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);
		});

		it("should mark cells directly following colSpan-cell with _span property and set min/maxWidth to 0", function () {
			tableNode.table.body.push([{ text: "Col 1", colSpan: 3 }, {}, {}, "Col 4"]);
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);

			var rows = tableNode.table.body.length;
			assert(tableNode.table.body[rows - 1][1]._span !== undefined);
			assert(tableNode.table.body[rows - 1][2]._span !== undefined);
			assert(tableNode.table.body[rows - 1][3]._span === undefined);
			assert.equal(tableNode.table.body[rows - 1][1]._minWidth, 0);
			assert.equal(tableNode.table.body[rows - 1][1]._maxWidth, 0);
			assert.equal(tableNode.table.body[rows - 1][2]._minWidth, 0);
			assert.equal(tableNode.table.body[rows - 1][2]._maxWidth, 0);
		});

		it("spanning cells should not influence min/max column widths if their min/max widths are lower or equal", function () {
			tableNode.layout = emptyTableLayout;

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);
			var col0min = tableNode.table.widths[0]._minWidth;
			var col0max = tableNode.table.widths[0]._maxWidth;
			var col1min = tableNode.table.widths[1]._minWidth;
			var col1max = tableNode.table.widths[1]._maxWidth;

			tableNode.table.body.push([{ text: "Co1", colSpan: 2 }, {}, "Column 3", "Column 4"]);
			tableNode.table.body.push([{ text: "123456789012", colSpan: 2 }, {}, "Column 3", "Column 4"]);
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);

			assert.equal(tableNode.table.widths[0]._minWidth, col0min);
			assert.equal(tableNode.table.widths[0]._maxWidth, col0max);
			assert.equal(tableNode.table.widths[1]._minWidth, col1min);
			assert.equal(tableNode.table.widths[1]._maxWidth, col1max);
		});

		it("spanning cells, having min-width larger than the sum of min-widths of the columns they span over, should update column min-widths equally", function () {
			tableNode.layout = emptyTableLayout;

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);
			var col0min = tableNode.table.widths[0]._minWidth;
			var col1min = tableNode.table.widths[1]._minWidth;

			assert.equal(col0min, 6 * 12);
			assert.equal(col1min, 6 * 12);

			// make sure we know default values for

			tableNode.table.body.push([
				{ text: "thisislongera", colSpan: 2 },
				{},
				"Column 3",
				"Column 4",
			]);
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);

			assert(tableNode.table.widths[0]._minWidth > col0min);
			assert(tableNode.table.widths[1]._minWidth > col1min);

			assert.equal(tableNode.table.widths[0]._minWidth, col1min + (1 * 12) / 2);
			assert.equal(tableNode.table.widths[1]._minWidth, col1min + (1 * 12) / 2);
		});

		it("spanning cells, having max-width larger than the sum of max-widths of the columns they span over, should update column max-widths equally", function () {
			tableNode.layout = emptyTableLayout;

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);
			var col0max = tableNode.table.widths[0]._maxWidth;
			var col1max = tableNode.table.widths[1]._maxWidth;

			assert.equal(col0max, 26 * 12);
			assert.equal(col1max, 22 * 12);

			tableNode.table.body.push([
				{ text: "1234 6789 1234 6789 1234 6789 1234 6789 1234 6789", colSpan: 2 },
				{},
				"Column 3",
				"Column 4",
			]);
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);

			assert.equal(tableNode.table.widths[0]._maxWidth, col0max + (1 * 12) / 2);
			assert.equal(tableNode.table.widths[1]._maxWidth, col1max + (1 * 12) / 2);
		});

		it("calculating widths (when colSpan are used) should take into account cell padding and borders", function () {
			// 5 + 3 + 4 == 12 --- the exact width of the overflowing letter in thisislongera
			// it means we have enough space and there's no need to change column widths
			tableNode.layout = {
				vLineWidth: function () {
					return 5;
				},
				paddingLeft: function () {
					return 3;
				},
				paddingRight: function () {
					return 4;
				},
			};

			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);
			var col0min = tableNode.table.widths[0]._minWidth;
			var col1min = tableNode.table.widths[1]._minWidth;

			assert.equal(col0min, 6 * 12);
			assert.equal(col1min, 6 * 12);

			tableNode.table.body.push([
				{ text: "thisislongera", colSpan: 2 },
				{},
				"Column 3",
				"Column 4",
			]);
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);

			assert.equal(tableNode.table.widths[0]._minWidth, col0min);
			assert.equal(tableNode.table.widths[1]._minWidth, col1min);
		});

		it("should mark cells directly below rowSpan-cell with _span property and set min/maxWidth to 0", function () {
			tableNode.table.body.push([{ text: "Col 1", rowSpan: 3 }, "Col2", "Col 3", "Col 4"]);
			tableNode.table.body.push([{}, "Col2", "Col 3", "Col 4"]);
			tableNode.table.body.push([{}, "Col2", "Col 3", "Col 4"]);
			tableNode.table.body.push(["Another", "Col2", "Col 3", "Col 4"]);
			docPreprocessor.preprocessTable(tableNode);
			docMeasure.measureTable(tableNode);

			var rows = tableNode.table.body.length;
			assert(tableNode.table.body[rows - 3][0]._span !== undefined);
			assert(tableNode.table.body[rows - 2][0]._span !== undefined);
			assert(tableNode.table.body[rows - 1][0]._span === undefined);

			assert.equal(tableNode.table.body[rows - 3][0]._minWidth, 0);
			assert.equal(tableNode.table.body[rows - 3][0]._maxWidth, 0);
			assert.equal(tableNode.table.body[rows - 2][0]._minWidth, 0);
			assert.equal(tableNode.table.body[rows - 2][0]._maxWidth, 0);
			assert(tableNode.table.body[rows - 1][0]._minWidth !== 0);
			assert(tableNode.table.body[rows - 1][0]._maxWidth !== 0);
		});
	});

	describe("measureImage", function () {
		it("measures registered images embedded in text", function () {
			const measure = new DocMeasure({
				...sampleTestProvider,
				images: {},
				provideImage: () => ({ width: 40, height: 20, orientation: 0 }),
			});
			const node = { text: ["before ", { image: "logo", width: 20 }, " after"] };
			docPreprocessor.preprocessDocument(node);

			const result = measure.measureDocument(node);
			const image = result._inlines!.find((inline) => inline.image !== undefined)!;

			assert.equal(image.image, "logo");
			assert.equal(image.width, 20);
			assert.equal(image.height, 10);
		});

		it("registers Uint8Array images as inline image resources", function () {
			const images: Record<string, string | Uint8Array | ArrayBuffer> = {};
			const measure = new DocMeasure({ images });
			const source = new Uint8Array([1, 2, 3]);
			const imageNode = { image: source } as MeasuredPdfNode;

			measure.convertIfInlineImage(imageNode);

			assert.equal(typeof imageNode.image, "string");
			assert.strictEqual(images[imageNode.image as string], source);
		});

		it("deduplicates repeated inline image resources", function () {
			const images: Record<string, string | Uint8Array | ArrayBuffer> = {};
			const measure = new DocMeasure({ images });
			const bytes = new Uint8Array([1, 2, 3]);
			const dataUrl = "data:image/png;base64,AQID";
			const byteNodes = [{ image: bytes }, { image: bytes }] as MeasuredPdfNode[];
			const dataUrlNodes = [{ image: dataUrl }, { image: dataUrl }] as MeasuredPdfNode[];

			for (const node of [...byteNodes, ...dataUrlNodes]) measure.convertIfInlineImage(node);

			assert.equal(byteNodes[0].image, byteNodes[1].image);
			assert.equal(dataUrlNodes[0].image, dataUrlNodes[1].image);
			assert.notEqual(byteNodes[0].image, dataUrlNodes[0].image);
			assert.equal(Object.keys(images).length, 2);
		});

		it("should measure images with invalid width", function () {
			var imageNode = {
				image: "...",
				width: "auto",
			};
			var result = docMeasure.measureImageWithDimensions(imageNode, { width: 42, height: 42 });

			assert.equal(result._height, 42);
			assert.equal(result._width, 42);
		});

		it("should measure images with invalid height", function () {
			var imageNode = {
				image: "...",
				height: "auto",
			};
			var result = docMeasure.measureImageWithDimensions(imageNode, { width: 42, height: 42 });

			assert.equal(result._height, 42);
			assert.equal(result._width, 42);
		});

		it("should support dataUri images", function () {});
	});

	describe("measureSVG", function () {
		it("decodes SVG data URLs", function () {
			const measure = new DocMeasure({ svgs: {}, virtualfs: null }, {}, {}, new SVGMeasure());
			const node = {
				svg: "data:image/svg+xml,%3Csvg%20width%3D%2210%22%20height%3D%2220%22%3E%3C%2Fsvg%3E",
			} as MeasuredPdfNode;

			const result = measure.measureSVG(node);

			assert.equal(result._width, 10);
			assert.equal(result._height, 20);
			assert.match(result.svg as string, /^<svg/);
		});

		it("loads named SVG resources from the virtual file system", function () {
			const measure = new DocMeasure(
				{
					svgs: { logo: "resolved-logo.svg" },
					virtualfs: {
						existsSync: (name: string) => name === "resolved-logo.svg",
						readFileSync: () => '<svg width="30" height="40"></svg>',
					},
				},
				{},
				{},
				new SVGMeasure(),
			);

			const result = measure.measureSVG({ svg: "logo" } as MeasuredPdfNode);

			assert.equal(result._width, 30);
			assert.equal(result._height, 40);
		});
	});

	describe("measureDocument", function () {
		it("should treat margin in styling properties with higher priority", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { "marginStyle": { margin: 10 } }, {});
			var node = { text: "test", style: "marginStyle", margin: [5, 5, 5, 5] };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [5, 5, 5, 5]);
		});

		it("should apply margins defined in the styles", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{ "topLevel": { margin: [123, 3, 5, 6] } },
				{},
			);
			var node = { text: "test", style: "topLevel" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [123, 3, 5, 6]);
		});

		it("should apply marginLeft: 10, margin: 20", function () {
			docMeasure = new DocMeasure(sampleTestProvider, {}, {});
			var node = { text: "test", marginLeft: 10, margin: 20 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [20, 20, 20, 20]);
		});

		it("should apply marginLeft: 10, margin: 0", function () {
			docMeasure = new DocMeasure(sampleTestProvider, {}, {});
			var node = { text: "test", marginLeft: 10, margin: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [0, 0, 0, 0]);
		});

		it("should apply margin: 20 from style - overridden with margin: 10", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { margin: { margin: 20 } }, {});
			var node = { text: "test", style: "margin", margin: 10 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [10, 10, 10, 10]);
		});

		it("should apply margin: 20 from style - marginLeft: 10, margin: 0", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { margin: { margin: 20 } }, {});
			var node = { text: "test", style: "margin", margin: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [0, 0, 0, 0]);
		});

		it("should apply margin: 20 from style - overridden with marginLeft: 10", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { margin: { margin: 20 } }, {});
			var node = { text: "test", style: "margin", marginLeft: 10 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [10, 20, 20, 20]);
		});

		it("should apply margin: 20 from style - overridden with marginLeft: 0", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { margin: { margin: 20 } }, {});
			var node = { text: "test", style: "margin", marginLeft: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [0, 20, 20, 20]);
		});

		it("should apply marginLeft: 20 from style - overridden with 10", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { marginLeft: { marginLeft: 20 } }, {});
			var node = { text: "test", style: "marginLeft", marginLeft: 10 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [10, 0, 0, 0]);
		});

		it("should apply marginLeft: 20 from style - overridden with 0", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { marginLeft: { marginLeft: 20 } }, {});
			var node = { text: "test", style: "marginLeft", marginLeft: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [0, 0, 0, 0]);
		});

		it("should apply marginLeft: 20 from style - overridden with margin: 10", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { marginLeft: { marginLeft: 20 } }, {});
			var node = { text: "test", style: "marginLeft", margin: 10 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [10, 10, 10, 10]);
		});

		it("should apply marginLeft: 20 from style - overridden with margin: 0", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { marginLeft: { marginLeft: 20 } }, {});
			var node = { text: "test", style: "marginLeft", margin: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [0, 0, 0, 0]);
		});

		it("should apply margin override from multiple styles", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{ quote: { margin: [20, 0, 20, 0] }, small: { margin: [0, 0, 0, 5] } },
				{},
			);
			var node = { text: "test", style: ["quote", "small"] };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [0, 0, 0, 5]);
		});

		it("should apply sublevel styles not to parent", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{ "topLevel": { margin: [123, 3, 5, 6] }, "subLevel": { margin: 5 } },
				{},
			);
			var node = { ul: ["one", "two", { text: "three", style: "subLevel" }], style: "topLevel" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [123, 3, 5, 6]);
			assert.equal(result.ul[0]._margin, null);
			assert.equal(result.ul[1]._margin, null);
			assert.deepEqual(result.ul[2]._margin, [5, 5, 5, 5]);
		});

		it("should apply subsublevel styles not to parent", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{
					"topLevel": { margin: [123, 3, 5, 6] },
					"subLevel": { margin: 5 },
					"subsubLevel": { margin: 25 },
				},
				{},
			);
			var node = {
				ul: [
					"one",
					"two",
					{ text: "three", style: "subLevel" },
					{ ol: [{ text: "three A", style: "subsubLevel" }] },
				],
				style: "topLevel",
			};
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [123, 3, 5, 6]);
			assert.equal(result.ul[0]._margin, null);
			assert.equal(result.ul[1]._margin, null);
			assert.deepEqual(result.ul[2]._margin, [5, 5, 5, 5]);
			assert.deepEqual(result.ul[3].ol[0]._margin, [25, 25, 25, 25]);
		});

		it("should process marginLeft property if defined", function () {
			var node = { text: "some text", marginLeft: 5 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [5, 0, 0, 0]);
		});

		it("should process marginRight property if defined", function () {
			var node = { text: "some text", marginRight: 5 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [0, 0, 5, 0]);
		});

		it("should process multiple single margin properties if defined", function () {
			var node = { text: "some text", marginRight: 5, marginTop: 10, marginBottom: 2 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [0, 10, 5, 2]);
		});

		it("should treat margin property with higher priority than single margin properties", function () {
			var node = { text: "some text", marginRight: 5, marginTop: 10, marginBottom: 2, margin: 12 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [12, 12, 12, 12]);
		});

		it("should combine all single margins defined in style dict ", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{ "style1": { marginLeft: 5 }, "style2": { marginTop: 10 } },
				{},
			);
			var node = { text: "some text", style: ["style1", "style2"] };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [5, 10, 0, 0]);
		});

		it("should combine the single margin defined in style dict and the object itself", function () {
			docMeasure = new DocMeasure(sampleTestProvider, { "style1": { marginLeft: 5 } }, {});
			var node = { text: "some text", style: ["style1"], marginRight: 15 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [5, 0, 15, 0]);
		});

		it("should override only left margin if marginLeft is defined", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{ "topLevel": { margin: [123, 3, 5, 6] }, "subLevel": { marginLeft: 5 } },
				{},
			);
			var node = { ul: ["one", "two", { text: "three", style: "subLevel" }], style: "topLevel" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [123, 3, 5, 6]);
			assert.deepEqual(result.ul[2]._margin, [5, 0, 0, 0]);
		});

		it("should process margin in extends styles", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{
					header: {
						margin: [1, 1, 1, 1],
					},
					subheader: {
						marginLeft: 2,
						extends: "header",
					},
				},
				{},
			);
			var node = { text: "test", style: "subheader" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [2, 1, 1, 1]);
		});

		it("should process margin in multiple extends styles", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{
					styleTop: {
						marginTop: 1,
					},
					styleBottom: {
						marginBottom: 2,
					},
					subheader: {
						marginLeft: 3,
						extends: ["styleTop", "styleBottom"],
					},
				},
				{},
			);
			var node = { text: "test", style: "subheader" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [3, 1, 0, 2]);
		});

		it("should process margin in multiple extends styles from styles 1", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{
					marginLeft: {
						marginLeft: 50,
						color: "red",
					},
					margin: {
						margin: [20, 20, 20, 20],
						color: "green",
					},
					marginExtends1: {
						extends: ["margin", "marginLeft"],
					},
					marginExtends2: {
						extends: ["marginLeft", "margin"],
					},
					marginExtends3: {
						extends: ["marginExtends1", "marginExtends2"],
					},
					marginExtends4: {
						extends: ["marginExtends2", "marginExtends1"],
					},
				},
				{},
			);
			var node = { text: "test", style: "marginExtends3" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [20, 20, 20, 20]);
		});

		it("should process margin in multiple extends styles from styles 2", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{
					marginLeft: {
						marginLeft: 50,
						color: "red",
					},
					margin: {
						margin: [20, 20, 20, 20],
						color: "green",
					},
					marginExtends1: {
						extends: ["margin", "marginLeft"],
					},
					marginExtends2: {
						extends: ["marginLeft", "margin"],
					},
					marginExtends3: {
						extends: ["marginExtends1", "marginExtends2"],
					},
					marginExtends4: {
						extends: ["marginExtends2", "marginExtends1"],
					},
				},
				{},
			);
			var node = { text: "test", style: "marginExtends4" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [50, 20, 20, 20]);
		});

		it("should process margin in multiple extends styles from styles 3", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{
					marginLeft: {
						marginLeft: 50,
						color: "red",
					},
					margin: {
						margin: [20, 20, 20, 20],
						color: "green",
					},
					marginExtends1: {
						extends: ["margin", "marginLeft"],
					},
					marginExtends2: {
						extends: ["marginLeft", "margin"],
					},
					marginExtends3: {
						extends: ["marginExtends1", "marginExtends2"],
					},
					marginExtends4: {
						extends: ["marginExtends2", "marginExtends1"],
					},
				},
				{},
			);
			var node = { text: "test", style: ["marginExtends1", "marginExtends2"] };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [20, 20, 20, 20]);
		});

		it("should process margin in multiple extends styles from styles 4", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{
					marginLeft: {
						marginLeft: 50,
						color: "red",
					},
					margin: {
						margin: [20, 20, 20, 20],
						color: "green",
					},
					marginExtends1: {
						extends: ["margin", "marginLeft"],
					},
					marginExtends2: {
						extends: ["marginLeft", "margin"],
					},
					marginExtends3: {
						extends: ["marginExtends1", "marginExtends2"],
					},
					marginExtends4: {
						extends: ["marginExtends2", "marginExtends1"],
					},
				},
				{},
			);
			var node = { text: "test", style: ["marginExtends2", "marginExtends1"] };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [50, 20, 20, 20]);
		});

		it("should process margin in extends styles with infinite loop 1", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{
					header: {
						margin: [1, 1, 1, 1],
						extends: "subheader",
					},
					subheader: {
						marginLeft: 2,
						extends: "header",
					},
				},
				{},
			);
			var node = { text: "test", style: "subheader" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [2, 1, 1, 1]);
		});

		it("should process margin in extends styles with infinite loop 2", function () {
			docMeasure = new DocMeasure(
				sampleTestProvider,
				{
					subheader: {
						marginLeft: 2,
						extends: "subheader",
					},
				},
				{},
			);
			var node = { text: "test", style: "subheader" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureDocument(node);
			assert.deepEqual(result._margin, [2, 0, 0, 0]);
		});
	});
});
