import { assert, beforeEach, describe, it, vi } from "vitest";
import type { Dictionary, Style } from "../../../types/index.ts";
import type { LayoutBuilder } from "../../../../tests/helpers/layout-builder.ts";
import {
	createLayoutBuilder,
	sampleTestProvider,
} from "../../../../tests/helpers/layout-builder.ts";

describe("LayoutBuilder", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	describe("dynamic background", function () {
		var docStructure: unknown;
		var pdfDocument: unknown;
		var styleDictionary: Dictionary<Style>;
		const defaultStyle = undefined;
		var background: ReturnType<typeof vi.fn> | undefined;
		const header = undefined;
		const footer = undefined;
		const watermark = undefined;
		const pageBreakBeforeFunction = undefined;

		beforeEach(function () {
			pdfDocument = sampleTestProvider;
			styleDictionary = {};
		});

		it("supports the legacy current-page and page-size signature", function () {
			docStructure = ["Text"];
			background = vi.fn((_page: number, _pageSize: unknown) => undefined);

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

			var pageSize = { width: 400, height: 800, orientation: "portrait" };
			assert.equal(background.mock.calls[0][0], 1);
			assert.deepEqual(background.mock.calls[0][1], pageSize);
		});

		it("provides the total page count to the three-argument signature", function () {
			docStructure = [{ text: "First page", pageBreak: "after" }, "Second page"];
			background = vi.fn((_page: number, pageCount: number, _pageSize: unknown) =>
				pageCount > 0 ? `of ${pageCount}` : undefined,
			);

			const pages = builder.layoutDocument(
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
			assert.equal(background.mock.calls.at(-2)?.[0], 1);
			assert.equal(background.mock.calls.at(-2)?.[1], 2);
			assert.deepEqual(background.mock.calls.at(-2)?.[2], pages[0].pageSize);
			assert.equal(background.mock.calls.at(-1)?.[0], 2);
			assert.equal(background.mock.calls.at(-1)?.[1], 2);
			assert.deepEqual(background.mock.calls.at(-1)?.[2], pages[1].pageSize);
		});
	});
});
