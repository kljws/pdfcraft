import { assert, describe, it } from "vitest";
import { createBuiltInPreprocessing } from "../../../composition/built-in-preprocessing.ts";
import { createTestMeasurement } from "../../../__tests__/fixtures/measurement.ts";
import type { PdfFont, PdfNode, TextMeasurement } from "../../../types/internal.ts";
import type { ListItemState } from "../list.types.ts";

interface MeasuredFixture extends PdfNode, ListItemState {
	_minWidth: number;
	_maxWidth: number;
	metrics: { gapSize: TextMeasurement };
	ul: MeasuredFixture[];
	ol: MeasuredFixture[];
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

describe("List measurement", function () {
	describe("measureUnorderedList", function () {
		it("should extend document-definition-object if text items are used", function () {
			var node = { ul: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert(result.ul[0]._minWidth);
			assert(result.ul[0]._maxWidth);

			assert(result.metrics.gapSize);
		});
	});

	describe("measureOrderedList", function () {
		it("should extend document-definition-object if text items are used", function () {
			var node = { ol: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert(result.ol[0]._minWidth);
			assert(result.ol[0]._maxWidth);

			assert(result.metrics.gapSize);
		});

		it("should not increase listMarker when list item is a nested list", function () {
			var node = {
				ol: ["parent item 1", { ol: ["nested item 1", "nested item 2"] }, "parent item 2"],
			};
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result.ol[2].listMarker!._inlines![0].text, "2. ");
		});

		it("should calculate _minWidth and _maxWidth of all elements", function () {
			var node = { ol: ["this is a test", "another one"] };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result.ol[0]._minWidth, 4 * 12);
			assert.equal(result.ol[0]._maxWidth, 14 * 12);
			assert.equal(result.ol[1]._minWidth, 7 * 12);
			assert.equal(result.ol[1]._maxWidth, 11 * 12);
		});

		it("should set _minWidth and _maxWidth to the max of inner min/max widths + gapSize", function () {
			var node = { ol: ["this is a test", "another one"] };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert.strictEqual(result, node as unknown as MeasuredFixture);
			assert(result.metrics.gapSize.width > 0);
			assert.equal(result._minWidth, 7 * 12 + result.metrics.gapSize.width);
			assert.equal(result._maxWidth, 14 * 12 + result.metrics.gapSize.width);
		});
	});
});
