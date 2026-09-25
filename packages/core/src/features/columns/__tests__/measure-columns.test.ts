import { assert, describe, it } from "vitest";
import { createBuiltInPreprocessing } from "../../../composition/built-in-preprocessing.ts";
import {
	createTestMeasurement,
	sampleTestProvider,
} from "../../../__tests__/fixtures/measurement.ts";
import type { ColumnNode, PdfNode } from "../../../types/internal.ts";

interface MeasuredFixture extends PdfNode {
	_minWidth: number;
	_maxWidth: number;
	columns: Array<ColumnNode & MeasuredFixture>;
}

const docMeasure = createTestMeasurement<MeasuredFixture>(sampleTestProvider);
const docPreprocessor = createBuiltInPreprocessing();

describe("Columns measurement", function () {
	describe("measureColumns", function () {
		it("should extend document-definition-object if text columns are used", function () {
			var node = { columns: ["asdasd", "bbbb"] };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert(result.columns[0]._minWidth);
			assert(result.columns[0]._maxWidth);
		});

		it("should calculate _minWidth and _maxWidth of all columns", function () {
			var node = { columns: ["this is a test", "another one"] };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

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
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result._minWidth, 4 * 12 + 7 * 12);
			assert.equal(result._maxWidth, 14 * 12 + 11 * 12);
		});

		it("should set _minWidth and _maxWidth properly when star columns are defined", function () {
			var node = { columns: ["this is a test", "another one"], columnGap: 0 };
			docPreprocessor.preprocessBlock(node);
			var result = docMeasure.measureNode(node);

			assert.equal(result._minWidth, 7 * 12 + 7 * 12);
			assert.equal(result._maxWidth, 14 * 12 + 14 * 12);
		});
	});
});
