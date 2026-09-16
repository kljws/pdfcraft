import { assert, beforeEach, describe, it, vi } from "vitest";
import type { Dictionary, Style } from "../../../types/index.ts";
import {
	createLayoutBuilder,
	emptyTableLayout,
	LayoutBuilder,
	sampleTestProvider,
} from "../../../../tests/helpers/layout-builder.ts";

describe("LayoutBuilder", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	describe("dynamic header/footer", function () {
		var docStructure: unknown;
		var pdfDocument: unknown;
		var styleDictionary: Dictionary<Style>;
		const defaultStyle = undefined;
		var background: ReturnType<typeof vi.fn> | undefined;
		var header: ReturnType<typeof vi.fn> | undefined;
		var footer: ReturnType<typeof vi.fn> | undefined;
		const watermark = undefined;
		const pageBreakBeforeFunction = undefined;

		beforeEach(function () {
			pdfDocument = sampleTestProvider;
			styleDictionary = {};
		});

		it("should provide the current page, page count and page size", function () {
			docStructure = ["Text"];
			header = vi.fn();
			footer = vi.fn();
			background = vi.fn();

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
			assert.equal(header.mock.calls[0][0], 1);
			assert.equal(header.mock.calls[0][1], 1);
			assert.deepEqual(header.mock.calls[0][2], pageSize);

			assert.equal(footer.mock.calls[0][0], 1);
			assert.equal(footer.mock.calls[0][1], 1);
			assert.deepEqual(footer.mock.calls[0][2], pageSize);
		});

		it("finalizes automatic page height before footer and watermark layout", function () {
			const autoHeightBuilder = new LayoutBuilder(
				{ width: 200, height: Infinity, orientation: "portrait" },
				{ left: 40, right: 40, top: 40, bottom: 40 },
			);
			footer = vi.fn(() => "Footer");

			const pages = autoHeightBuilder.layoutDocument(
				["Short content"],
				sampleTestProvider,
				{},
				{ fontSize: 12, font: "Roboto" },
				undefined,
				undefined,
				footer,
				"DRAFT",
			);

			const measuredWatermark = pages[0].watermark as {
				fontSize: number;
				_size: { rotatedSize: { height: number } };
			};
			assert.equal(Number.isFinite(pages[0].pageSize.height), true);
			assert.equal(autoHeightBuilder.pageSize.height, Infinity);
			assert.equal(footer.mock.calls[0][2].height, pages[0].pageSize.height);
			assert.ok(measuredWatermark.fontSize < 100);
			assert.ok(measuredWatermark._size.rotatedSize.height <= pages[0].pageSize.height + 1);
		});

		it("expands the bottom margin and repaginates table rows for a tall footer", function () {
			footer = vi.fn(() => ({ text: "Footer\n".repeat(10) }));

			const pages = builder.layoutDocument(
				{
					table: {
						widths: "auto",
						heights: 25,
						body: {
							groups: [
								{
									dontBreakRows: true,
									rows: Array.from({ length: 27 }, (_, index) => [`Product ${index + 1}`]),
								},
							],
							layout: emptyTableLayout,
						},
					},
				},
				pdfDocument,
				styleDictionary,
				defaultStyle,
				undefined,
				undefined,
				footer,
				watermark,
				pageBreakBeforeFunction,
			);

			assert.equal(pages.length, 2);
			for (const page of pages) {
				assert.equal(page.pageMargins.left, 40);
				assert.equal(page.pageMargins.right, 40);
				assert.equal(page.pageMargins.top, 40);
				assert.ok(page.pageMargins.bottom > 40);
				const footerTop = page.pageSize.height - page.pageMargins.bottom;
				const footerLines = page.items.filter(
					(item) =>
						item.type === "line" && item.item.inlines.some((inline) => inline.text === "Footer"),
				);
				const productLines = page.items.filter(
					(item) =>
						item.type === "line" &&
						item.item.inlines.some((inline) => inline.text.startsWith("Product ")),
				);
				assert.ok(footerLines.length > 0);
				assert.ok(footerLines.every((line) => line.item.y >= footerTop));
				assert.ok(productLines.every((line) => line.item.y + line.item.getHeight() <= footerTop));
			}
		});

		it("rejects a footer too tall to leave usable page content area", function () {
			footer = vi.fn(() => ({ text: "Footer\n".repeat(100) }));

			assert.throws(
				() =>
					builder.layoutDocument(
						["Text"],
						pdfDocument,
						styleDictionary,
						defaultStyle,
						undefined,
						undefined,
						footer,
						watermark,
						pageBreakBeforeFunction,
					),
				/Footer content on page 1 is too tall to leave usable page content area\./,
			);
		});
	});

});
