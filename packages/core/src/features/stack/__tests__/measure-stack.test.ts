import { assert, describe, it } from "vitest";
import BaseDocPreprocessor from "../../../preprocessing/doc-preprocessor.ts";
import BaseDocMeasure from "../../../measurement/doc-measure.ts";
import type PDFDocument from "../../../rendering/pdf-document.ts";
import type { Dictionary, PdfCraftExtensions, Style } from "../../../types/index.ts";
import type {
	MeasuredPdfNode,
	PdfFont,
	PdfNode,
	PreprocessedPdfNode,
	TableLayout,
} from "../../../types/internal.ts";

interface MeasuredFixture extends PdfNode {
	_minWidth: number;
	_maxWidth: number;
	stack: MeasuredFixture[];
}

const measured = (node: MeasuredPdfNode): MeasuredFixture => node as MeasuredFixture;

class DocMeasure extends BaseDocMeasure {
	constructor(
		pdfDocument: unknown,
		styleDictionary: Dictionary<Style> = {},
		defaultStyle: Style = {},
		extensions: PdfCraftExtensions = [],
		tableLayouts: Dictionary<Partial<TableLayout>> = {},
	) {
		super(pdfDocument as PDFDocument, styleDictionary, defaultStyle, extensions, tableLayouts);
	}

	override measureNode(node: unknown): MeasuredFixture {
		return measured(super.measureNode(node as PreprocessedPdfNode));
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

const docMeasure = new DocMeasure(sampleTestProvider);
const docPreprocessor = new BaseDocPreprocessor();

describe("Stack measurement", function () {
	describe("measureVerticalContainer", function () {
		it("should extend document-definition-object if text paragraphs are used", function () {
			var node = { stack: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessNode(node);
			var result = docMeasure.measureNode(node);

			assert(result.stack[0]._minWidth);
			assert(result.stack[0]._maxWidth);
		});

		it("should calculate _minWidth and _maxWidth of all elements", function () {
			var node = { stack: ["this is a test", "another one"] };
			docPreprocessor.preprocessNode(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result.stack[0]._minWidth, 4 * 12);
			assert.equal(result.stack[0]._maxWidth, 14 * 12);
			assert.equal(result.stack[1]._minWidth, 7 * 12);
			assert.equal(result.stack[1]._maxWidth, 11 * 12);
		});

		it("should set _minWidth and _maxWidth to the max of inner min/max widths", function () {
			var node = { stack: ["this is a test", "another one"] };
			docPreprocessor.preprocessNode(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result._minWidth, 7 * 12);
			assert.equal(result._maxWidth, 14 * 12);
		});
	});
});
