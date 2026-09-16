import { assert, beforeEach, describe, it, vi } from "vitest";
import type { Dictionary, Style } from "../../../types/index.ts";
import type { LayoutBuilder } from "../../../../tests/helpers/layout-builder.ts";
import { createLayoutBuilder, sampleTestProvider } from "../../../../tests/helpers/layout-builder.ts";


function isArray(variable: unknown): boolean {
	return Array.isArray(variable);
}
function isObject(variable: unknown): boolean {
	return variable !== null && typeof variable === "object";
}
function toString(variable: unknown): string {
	if (variable === undefined) return "undefined";
	if (variable === null) return "null";
	return String(variable);
}

describe("LayoutBuilder", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	describe("dynamic page break control", function () {
		var docStructure: unknown;
		var pdfDocument: unknown;
		var styleDictionary: Dictionary<Style>;
		const defaultStyle = undefined;
		const background = undefined;
		const header = undefined;
		const footer = undefined;
		const watermark = undefined;
		var pageBreakBeforeFunction: ReturnType<typeof vi.fn>;

		beforeEach(function () {
			pdfDocument = sampleTestProvider;
			styleDictionary = {};
		});

		it("should create a pageBreak before", function () {
			docStructure = [
				{ text: "Text 1", id: "text1" },
				{ text: "Text 2", id: "text2" },
			];
			pageBreakBeforeFunction = vi.fn(function (node: { id?: string }) {
				return node.id === "text1";
			});

			var pages = builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.equal(pages.length, 2);
		});

		it("should not check for page break if a page break is already specified", function () {
			docStructure = {
				stack: [
					{ text: "Text 1", id: "text1" },
					{ text: "Text 2", id: "text2", pageBreak: "before" },
				],
				id: "stack",
			};
			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert(pageBreakBeforeFunction.mock.calls.length === 2);
			assert.equal(pageBreakBeforeFunction.mock.calls[0][0].id, "stack");
			assert.deepEqual(
				{
					id: pageBreakBeforeFunction.mock.calls[1][0].id,
					text: pageBreakBeforeFunction.mock.calls[1][0].text,
				},
				{ id: "text1", text: "Text 1" },
			);
		});

		it("should provide the list of following nodes on the same page", function () {
			docStructure = [
				{ text: "Text 1 (Page 1)", id: "text1" },
				{ text: "Text 2 (Page 1)", id: "text2" },
				{ text: "Text 3 (Page 1)", id: "text3" },
				{ text: "Text 4 (Page 2)", id: "text4", pageBreak: "before" },
			];

			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.deepEqual(
				pageBreakBeforeFunction.mock.calls[1][1]
					.getFollowingNodesOnPage()
					.map((item: { id?: string }) => item.id),
				["text2", "text3"],
			);
		});

		it("should provide the list of nodes on the next page", function () {
			docStructure = {
				stack: [
					{ text: "Text 1 (Page 1)", id: "text1", pageBreak: "after" },
					{ text: "Text 2 (Page 1)", id: "text2" },
					{ text: "Text 3 (Page 1)", id: "text3" },
					{ text: "Text 4 (Page 1)", id: "text4" },
				],
				id: "stack",
			};

			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.deepEqual(
				pageBreakBeforeFunction.mock.calls[0][1]
					.getNodesOnNextPage()
					.map((item: { id?: string }) => item.id),
				["text2", "text3", "text4"],
			);
		});

		it("should provide the list of previous nodes on the same page", function () {
			docStructure = {
				stack: [
					{ text: "Text 1 (Page 1)", id: "text1", pageBreak: "after" },
					{ text: "Text 2 (Page 1)", id: "text2" },
					{ text: "Text 3 (Page 1)", id: "text3" },
					{ text: "Text 4 (Page 1)", id: "text4" },
				],
				id: "stack",
			};

			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.deepEqual(
				pageBreakBeforeFunction.mock.calls[4][1]
					.getPreviousNodesOnPage()
					.map((item: { id?: string }) => item.id),
				["stack", "text2", "text3"],
			);
		});

		it("should provide the pages of the node", function () {
			docStructure = [
				{ text: "Text 1 (Page 1)", id: "text1" },
				{ text: "Text 2 (Page 1)", id: "text2" },
				{ text: "Text 3 (Page 1)", id: "text3" },
				{ text: "Text 4 (Page 2)", id: "text4", pageBreak: "before" },
			];

			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.equal(pageBreakBeforeFunction.mock.calls[0][0].pages, 2);
		});

		it("should provide the headlineLevel of the node", function () {
			docStructure = [{ text: "Text 1 (Page 1)", id: "text1", headlineLevel: 6 }];

			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.equal(pageBreakBeforeFunction.mock.calls[1][0].headlineLevel, 6);
		});

		it("should provide the position of the node", function () {
			docStructure = [{ text: "Text 1 (Page 1)", id: "text1" }];

			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.deepEqual(pageBreakBeforeFunction.mock.calls[0][0].startPosition, {
				pageNumber: 1,
				left: 40,
				top: 40,
				verticalRatio: 0,
				horizontalRatio: 0,
				pageOrientation: "portrait",
				pageInnerHeight: 720,
				pageInnerWidth: 320,
			});
		});

		it("should provide the pageOrientation of the node", function () {
			docStructure = [
				{ text: "Text 1 (Page 1)", id: "text1", pageOrientation: "landscape", style: "super-text" },
			];

			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.deepEqual(pageBreakBeforeFunction.mock.calls[1][0].pageOrientation, "landscape");
			assert.deepEqual(pageBreakBeforeFunction.mock.calls[1][0].style, "super-text");
		});

		it("should work with all specified elements", function () {
			docStructure = [
				{ text: "", id: "not-called-because-empty" },
				{ text: "Text 1 (Page 1)", id: "text" },
				{
					id: "table",
					table: {
						body: {
							groups: [
								{
									rows: [
										[
											{
												text: "Column 1 (Page 1)",
											},
										],
									],
								},
							],
						},
					},
				},
				{ id: "ul", ul: [{ text: "ul Item", id: "ul-item" }] },
				{ id: "ol", ol: [{ text: "ol Item", id: "ol-item" }] },
				{
					id: "image",
					image:
						"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQBAQAAAAAAAAAAAAAAAAAAAAX/2gAMAwEAAhADEAAAATY4f//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//aAAwDAQACAAMAAAAQn//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Qf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Qf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Qf//Z",
				},
				{ id: "box", box: "extension content" },
				{ id: "canvas", canvas: [{ type: "rect", x: 0, y: 0, w: 10, h: 10 }] },
				{ id: "columns", columns: [{ text: "column item", id: "column-item" }] },
			];

			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			function validateCalled(callIndex: number, nodeType: string, id: string) {
				var nodeInfo = pageBreakBeforeFunction.mock.calls[callIndex][0];
				assert.equal(nodeInfo.id, id);
				assert(nodeInfo[nodeType], "node type accessor " + nodeType + " not defined");
				assert(
					isObject(nodeInfo.startPosition),
					"start position is not an object but " + toString(nodeInfo.startPosition),
				);
				assert(
					isArray(nodeInfo.pageNumbers),
					"page numbers is not an array but " + toString(nodeInfo.pageNumbers),
				);
			}

			var textIndex = 1;
			validateCalled(textIndex, "text", "text");

			var tableIndex = textIndex + 1;
			validateCalled(tableIndex, "table", "table");

			var ulIndex = tableIndex + 2;
			validateCalled(ulIndex, "ul", "ul");
			validateCalled(ulIndex + 1, "text", "ul-item");

			var olIndex = ulIndex + 2;
			validateCalled(olIndex, "ol", "ol");
			validateCalled(olIndex + 1, "text", "ol-item");

			var imageIndex = olIndex + 2;
			validateCalled(imageIndex, "image", "image");

			var boxIndex = imageIndex + 1;
			validateCalled(boxIndex, "box", "box");

			var canvasIndex = boxIndex + 1;
			validateCalled(canvasIndex, "canvas", "canvas");

			var columnIndex = canvasIndex + 1;
			validateCalled(columnIndex, "columns", "columns");
			validateCalled(columnIndex + 1, "text", "column-item");
		});

		it("should provide all page numbers of the node", function () {
			var eightyLineBreaks = new Array(80).join("\n");
			docStructure = [
				{ text: "Text 1 (Page 1)", id: "text1" },
				{ text: "Text 2 (Page 1 & 2)" + eightyLineBreaks, id: "text2" },
				{ text: "Text 3 (Page 2)", id: "text3" },
			];

			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.deepEqual(pageBreakBeforeFunction.mock.calls[1][0].pageNumbers, [1]);
			assert.deepEqual(pageBreakBeforeFunction.mock.calls[2][0].pageNumbers, [1, 2]);
			assert.deepEqual(pageBreakBeforeFunction.mock.calls[3][0].pageNumbers, [2]);
		});

		it("updates child positions when an unbreakable block moves to the next page", function () {
			docStructure = [
				{ text: `Filler${new Array(57).join("\n")}`, id: "filler" },
				{ text: "Heading", id: "heading", headlineLevel: 1 },
				{
					stack: ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"],
					unbreakable: true,
					id: "unbreakable-block",
				},
			];
			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				header,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			const headingCall = pageBreakBeforeFunction.mock.calls.find(
				(call) => call[0].id === "heading",
			);
			assert(headingCall);
			assert.deepEqual(headingCall[1].getFollowingNodesOnPage(), []);
		});

		it("excludes repeatable header and footer nodes from pageBreakBefore", function () {
			docStructure = [{ text: "Body", id: "body" }];
			pageBreakBeforeFunction = vi.fn();

			builder.layoutDocument(
				docStructure,
				pdfDocument,
				styleDictionary,
				defaultStyle,
				background,
				{ text: "Header", id: "header" },
				{ text: "Footer", id: "footer" },
				watermark,
				pageBreakBeforeFunction,
			);

			const ids = pageBreakBeforeFunction.mock.calls.map((call) => call[0].id);
			assert.include(ids, "body");
			assert.notInclude(ids, "header");
			assert.notInclude(ids, "footer");
		});
	});

});
