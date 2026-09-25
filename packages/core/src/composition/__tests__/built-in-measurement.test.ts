import { assert, describe, it } from "vitest";
import { createBuiltInPreprocessing } from "../built-in-preprocessing.ts";
import { createTestMeasurement, sampleTestProvider } from "../../__tests__/fixtures/measurement.ts";
import { expectMeasuredKind } from "../../__tests__/fixtures/nodes.ts";
import type PDFDocument from "../../rendering/pdf-document.ts";

var docMeasure = createTestMeasurement(sampleTestProvider);
var docPreprocessor = createBuiltInPreprocessing();

describe("DocMeasure", function () {
	it("rejects content without a matching extension", function () {
		const measure = createTestMeasurement(sampleTestProvider as unknown as PDFDocument, {}, {});

		assert.throws(() => measure.measureNode({ custom: "test" }), /Unrecognized document structure/);
	});

	describe("measureNode", function () {
		it("should treat margin in styling properties with higher priority", function () {
			docMeasure = createTestMeasurement(sampleTestProvider, { marginStyle: { margin: 10 } }, {});
			var node = { text: "test", style: "marginStyle", margin: [5, 5, 5, 5] };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [5, 5, 5, 5]);
		});

		it("should apply margins defined in the styles", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{ topLevel: { margin: [123, 3, 5, 6] } },
				{},
			);
			var node = { text: "test", style: "topLevel" };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [123, 3, 5, 6]);
		});

		it("should apply marginLeft: 10, margin: 20", function () {
			docMeasure = createTestMeasurement(sampleTestProvider, {}, {});
			var node = { text: "test", marginLeft: 10, margin: 20 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [20, 20, 20, 20]);
		});

		it("should apply marginLeft: 10, margin: 0", function () {
			docMeasure = createTestMeasurement(sampleTestProvider, {}, {});
			var node = { text: "test", marginLeft: 10, margin: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [0, 0, 0, 0]);
		});

		it("should apply margin: 20 from style - overridden with margin: 10", function () {
			docMeasure = createTestMeasurement(sampleTestProvider, { margin: { margin: 20 } }, {});
			var node = { text: "test", style: "margin", margin: 10 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [10, 10, 10, 10]);
		});

		it("should apply margin: 20 from style - marginLeft: 10, margin: 0", function () {
			docMeasure = createTestMeasurement(sampleTestProvider, { margin: { margin: 20 } }, {});
			var node = { text: "test", style: "margin", margin: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [0, 0, 0, 0]);
		});

		it("should apply margin: 20 from style - overridden with marginLeft: 10", function () {
			docMeasure = createTestMeasurement(sampleTestProvider, { margin: { margin: 20 } }, {});
			var node = { text: "test", style: "margin", marginLeft: 10 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [10, 20, 20, 20]);
		});

		it("should apply margin: 20 from style - overridden with marginLeft: 0", function () {
			docMeasure = createTestMeasurement(sampleTestProvider, { margin: { margin: 20 } }, {});
			var node = { text: "test", style: "margin", marginLeft: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [0, 20, 20, 20]);
		});

		it("should apply marginLeft: 20 from style - overridden with 10", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{ marginLeft: { marginLeft: 20 } },
				{},
			);
			var node = { text: "test", style: "marginLeft", marginLeft: 10 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [10, 0, 0, 0]);
		});

		it("should apply marginLeft: 20 from style - overridden with 0", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{ marginLeft: { marginLeft: 20 } },
				{},
			);
			var node = { text: "test", style: "marginLeft", marginLeft: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [0, 0, 0, 0]);
		});

		it("should apply marginLeft: 20 from style - overridden with margin: 10", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{ marginLeft: { marginLeft: 20 } },
				{},
			);
			var node = { text: "test", style: "marginLeft", margin: 10 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [10, 10, 10, 10]);
		});

		it("should apply marginLeft: 20 from style - overridden with margin: 0", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{ marginLeft: { marginLeft: 20 } },
				{},
			);
			var node = { text: "test", style: "marginLeft", margin: 0 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [0, 0, 0, 0]);
		});

		it("should apply margin override from multiple styles", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{ quote: { margin: [20, 0, 20, 0] }, small: { margin: [0, 0, 0, 5] } },
				{},
			);
			var node = { text: "test", style: ["quote", "small"] };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [0, 0, 0, 5]);
		});

		it("should apply sublevel styles not to parent", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{ topLevel: { margin: [123, 3, 5, 6] }, subLevel: { margin: 5 } },
				{},
			);
			var node = { ul: ["one", "two", { text: "three", style: "subLevel" }], style: "topLevel" };
			docPreprocessor.preprocessDocument(node);
			var result = expectMeasuredKind(docMeasure.measureNode(node), "list");
			assert.deepEqual(result._margin, [123, 3, 5, 6]);
			assert(result.ul);
			assert.equal(result.ul[0]._margin, null);
			assert.equal(result.ul[1]._margin, null);
			assert.deepEqual(result.ul[2]._margin, [5, 5, 5, 5]);
		});

		it("should apply subsublevel styles not to parent", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{
					topLevel: { margin: [123, 3, 5, 6] },
					subLevel: { margin: 5 },
					subsubLevel: { margin: 25 },
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
			var result = expectMeasuredKind(docMeasure.measureNode(node), "list");
			assert.deepEqual(result._margin, [123, 3, 5, 6]);
			assert(result.ul);
			assert.equal(result.ul[0]._margin, null);
			assert.equal(result.ul[1]._margin, null);
			assert.deepEqual(result.ul[2]._margin, [5, 5, 5, 5]);
			const nestedList = expectMeasuredKind(result.ul[3], "list");
			assert(nestedList.ol);
			assert.deepEqual(nestedList.ol[0]._margin, [25, 25, 25, 25]);
		});

		it("should process marginLeft property if defined", function () {
			var node = { text: "some text", marginLeft: 5 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [5, 0, 0, 0]);
		});

		it("should process marginRight property if defined", function () {
			var node = { text: "some text", marginRight: 5 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [0, 0, 5, 0]);
		});

		it("should process multiple single margin properties if defined", function () {
			var node = { text: "some text", marginRight: 5, marginTop: 10, marginBottom: 2 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [0, 10, 5, 2]);
		});

		it("should treat margin property with higher priority than single margin properties", function () {
			var node = { text: "some text", marginRight: 5, marginTop: 10, marginBottom: 2, margin: 12 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [12, 12, 12, 12]);
		});

		it("should combine all single margins defined in style dict ", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{ style1: { marginLeft: 5 }, style2: { marginTop: 10 } },
				{},
			);
			var node = { text: "some text", style: ["style1", "style2"] };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [5, 10, 0, 0]);
		});

		it("should combine the single margin defined in style dict and the object itself", function () {
			docMeasure = createTestMeasurement(sampleTestProvider, { style1: { marginLeft: 5 } }, {});
			var node = { text: "some text", style: ["style1"], marginRight: 15 };
			docPreprocessor.preprocessDocument(node);
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [5, 0, 15, 0]);
		});

		it("should override only left margin if marginLeft is defined", function () {
			docMeasure = createTestMeasurement(
				sampleTestProvider,
				{ topLevel: { margin: [123, 3, 5, 6] }, subLevel: { marginLeft: 5 } },
				{},
			);
			var node = { ul: ["one", "two", { text: "three", style: "subLevel" }], style: "topLevel" };
			docPreprocessor.preprocessDocument(node);
			var result = expectMeasuredKind(docMeasure.measureNode(node), "list");
			assert.deepEqual(result._margin, [123, 3, 5, 6]);
			assert(result.ul);
			assert.deepEqual(result.ul[2]._margin, [5, 0, 0, 0]);
		});

		it("should process margin in extends styles", function () {
			docMeasure = createTestMeasurement(
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
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [2, 1, 1, 1]);
		});

		it("should process margin in multiple extends styles", function () {
			docMeasure = createTestMeasurement(
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
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [3, 1, 0, 2]);
		});

		it("should process margin in multiple extends styles from styles 1", function () {
			docMeasure = createTestMeasurement(
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
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [20, 20, 20, 20]);
		});

		it("should process margin in multiple extends styles from styles 2", function () {
			docMeasure = createTestMeasurement(
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
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [50, 20, 20, 20]);
		});

		it("should process margin in multiple extends styles from styles 3", function () {
			docMeasure = createTestMeasurement(
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
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [20, 20, 20, 20]);
		});

		it("should process margin in multiple extends styles from styles 4", function () {
			docMeasure = createTestMeasurement(
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
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [50, 20, 20, 20]);
		});

		it("should process margin in extends styles with infinite loop 1", function () {
			docMeasure = createTestMeasurement(
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
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [2, 1, 1, 1]);
		});

		it("should process margin in extends styles with infinite loop 2", function () {
			docMeasure = createTestMeasurement(
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
			var result = docMeasure.measureNode(node);
			assert.deepEqual(result._margin, [2, 0, 0, 0]);
		});
	});
});
