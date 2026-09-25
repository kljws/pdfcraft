import { assert, describe, it } from "vitest";
import BaseDocPreprocessor from "../../../composition/doc-preprocessor.ts";
import BaseDocMeasure from "../../../composition/doc-measure.ts";
import type PDFDocument from "../../../rendering/pdf-document.ts";
import type { Dictionary, PdfCraftExtensions, Style } from "../../../types/index.ts";
import type {
	MeasuredPdfNode,
	PdfFont,
	PdfNode,
	PreprocessedPdfNode,
	TableLayout,
	TextMeasurement,
} from "../../../types/internal.ts";

interface MeasuredFixture extends PdfNode {
	_minWidth: number;
	_maxWidth: number;
	metrics: { gapSize: TextMeasurement };
	ul: MeasuredFixture[];
	ol: MeasuredFixture[];
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

describe("List measurement", function () {
	describe("measureUnorderedList", function () {
		it("should extend document-definition-object if text items are used", function () {
			var node = { ul: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessNode(node);
			var result = docMeasure.measureNode(node);

			assert(result.ul[0]._minWidth);
			assert(result.ul[0]._maxWidth);

			assert(result.metrics.gapSize);
		});
	});

	describe("measureOrderedList", function () {
		it("should extend document-definition-object if text items are used", function () {
			var node = { ol: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessNode(node);
			var result = docMeasure.measureNode(node);

			assert(result.ol[0]._minWidth);
			assert(result.ol[0]._maxWidth);

			assert(result.metrics.gapSize);
		});

		it("should not increase listMarker when list item is a nested list", function () {
			var node = {
				ol: ["parent item 1", { ol: ["nested item 1", "nested item 2"] }, "parent item 2"],
			};
			docPreprocessor.preprocessNode(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result.ol[2].listMarker!._inlines![0].text, "2. ");
		});

		it("should calculate _minWidth and _maxWidth of all elements", function () {
			var node = { ol: ["this is a test", "another one"] };
			docPreprocessor.preprocessNode(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result.ol[0]._minWidth, 4 * 12);
			assert.equal(result.ol[0]._maxWidth, 14 * 12);
			assert.equal(result.ol[1]._minWidth, 7 * 12);
			assert.equal(result.ol[1]._maxWidth, 11 * 12);
		});

		it("should set _minWidth and _maxWidth to the max of inner min/max widths + gapSize", function () {
			var node = { ol: ["this is a test", "another one"] };
			docPreprocessor.preprocessNode(node);
			var result = docMeasure.measureNode(node);

			assert.strictEqual(result, node as unknown as MeasuredFixture);
			assert(result.metrics.gapSize.width > 0);
			assert.equal(result._minWidth, 7 * 12 + result.metrics.gapSize.width);
			assert.equal(result._maxWidth, 14 * 12 + result.metrics.gapSize.width);
		});
	});
});
