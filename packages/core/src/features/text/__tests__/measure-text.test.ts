import { assert, describe, it } from "vitest";
import { createBuiltInPreprocessing } from "../../../composition/built-in-preprocessing.ts";
import { createBuiltInMeasurement } from "../../../composition/built-in-measurement.ts";
import type PDFDocument from "../../../rendering/pdf-document.ts";
import type { MeasuredPdfNode, PreprocessedPdfNode } from "../../../types/internal.ts";
import type TextInlines from "../text-inlines.ts";
import type { MeasuredTextNode } from "../text.types.ts";

describe("Text measurement", function () {
	it("uses the replaceable inline measurer and sets inline and width data", function () {
		let called = false;
		const node = { text: "abc" };
		const measure = createBuiltInMeasurement({
			document: {} as PDFDocument,
			textInlines: {
				buildInlines: function () {
					called = true;
					return { items: ["abc"], minWidth: 1, maxWidth: 10 };
				},
			} as unknown as TextInlines,
		});
		createBuiltInPreprocessing().preprocessBlock(node);

		const result = measure.measureNode(node as PreprocessedPdfNode) as MeasuredTextNode;

		assert(called);
		assert.equal(result.metrics.inlines.length, 1);
		assert.equal(result._inlines, undefined);
		assert.equal(result._minWidth, 1);
		assert.equal(result._maxWidth, 10);
		assert.strictEqual(result, node as unknown as MeasuredPdfNode);
	});
});
