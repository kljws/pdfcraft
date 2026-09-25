import { assert, describe, it } from "vitest";
import { createBuiltInPreprocessing } from "../../../composition/built-in-preprocessing.ts";
import { createTestMeasurement } from "../../../__tests__/fixtures/measurement.ts";
import type { PdfFont, PdfNode } from "../../../types/internal.ts";

interface MeasuredFixture extends PdfNode {
	_minWidth: number;
	_maxWidth: number;
	stack: MeasuredFixture[];
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

const docMeasure = createTestMeasurement<MeasuredFixture>(sampleTestProvider);
const docPreprocessor = createBuiltInPreprocessing();

describe("Stack measurement", function () {
	describe("measureVerticalContainer", function () {
		it("should extend document-definition-object if text paragraphs are used", function () {
			var node = { stack: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert(result.stack[0]._minWidth);
			assert(result.stack[0]._maxWidth);
		});

		it("should calculate _minWidth and _maxWidth of all elements", function () {
			var node = { stack: ["this is a test", "another one"] };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result.stack[0]._minWidth, 4 * 12);
			assert.equal(result.stack[0]._maxWidth, 14 * 12);
			assert.equal(result.stack[1]._minWidth, 7 * 12);
			assert.equal(result.stack[1]._maxWidth, 11 * 12);
		});

		it("should set _minWidth and _maxWidth to the max of inner min/max widths", function () {
			var node = { stack: ["this is a test", "another one"] };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result._minWidth, 7 * 12);
			assert.equal(result._maxWidth, 14 * 12);
		});
	});
});
