import { assert, beforeEach, describe, it } from "vitest";
import type { LayoutBuilder } from "../../../../tests/helpers/layout-builder.ts";
import { createLayoutBuilder, emptyTableLayout, sampleTestProvider } from "../../../../tests/helpers/layout-builder.ts";

describe("LayoutBuilder", function () {
	let builder: LayoutBuilder;

	beforeEach(function () {
		builder = createLayoutBuilder();
	});

	describe("table layout", function () {
		it("should support tables with fixed widths", function () {
			var desc = [
				{
					table: {
						widths: [30, 50, 40],
						body: {
							groups: [
								{
									rows: [
										["a", "b", "c"],
										[
											{ text: "aaa", noWrap: true },
											{ text: "bbb", noWrap: true },
											{ text: "ccc", noWrap: true },
										],
									],
								},
							],
							layout: emptyTableLayout,
						},
					},
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 6);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 30);
			assert.equal(pages[0].items[2].item.x, 40 + 30 + 50);
			assert.equal(pages[0].items[3].item.x, 40);
			assert.equal(pages[0].items[4].item.x, 40 + 30);
			assert.equal(pages[0].items[5].item.x, 40 + 30 + 50);
			assert.equal(pages[0].items[0].item.y, 40);
			assert.equal(pages[0].items[1].item.y, 40);
			assert.equal(pages[0].items[2].item.y, 40);
			assert.equal(pages[0].items[3].item.y, 40 + 12);
			assert.equal(pages[0].items[4].item.y, 40 + 12);
			assert.equal(pages[0].items[5].item.y, 40 + 12);
		});

		it("should support tables with auto column widths", function () {
			var desc = [
				{
					table: {
						widths: "auto",
						body: {
							groups: [
								{
									rows: [
										["a", "b", "c"],
										["aaa", "bbb", "ccc"],
									],
								},
							],
							layout: emptyTableLayout,
						},
					},
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 6);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 3 * 12);
			assert.equal(pages[0].items[2].item.x, 40 + 6 * 12);
			assert.equal(pages[0].items[3].item.x, 40);
			assert.equal(pages[0].items[4].item.x, 40 + 3 * 12);
			assert.equal(pages[0].items[5].item.x, 40 + 6 * 12);
			assert.equal(pages[0].items[0].item.y, 40);
			assert.equal(pages[0].items[1].item.y, 40);
			assert.equal(pages[0].items[2].item.y, 40);
			assert.equal(pages[0].items[3].item.y, 40 + 12);
			assert.equal(pages[0].items[4].item.y, 40 + 12);
			assert.equal(pages[0].items[5].item.y, 40 + 12);
		});

		it("should support tables spanning across pages", function () {
			var desc = [
				{
					table: {
						widths: "auto",
						body: { groups: [{ rows: [] as unknown[][] }], layout: emptyTableLayout },
					},
				},
			];

			for (var i = 0; i < 80; i++) {
				desc[0].table.body.groups[0].rows.push(["a", "b", "c"]);
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
		});

		it("should support table-cell spanning across pages", function () {
			var desc = [
				{
					table: {
						widths: "auto",
						body: { groups: [{ rows: [] as unknown[][] }], layout: emptyTableLayout },
					},
				},
			];

			for (var i = 0; i < 59; i++) {
				desc[0].table.body.groups[0].rows.push(["a", "b", "c"]);
			}

			desc[0].table.body.groups[0].rows.push(["a\nb\nc", "a\nb\nc", "a\nb\nc"]);

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[1].items.length, 6);
		});

		it("should not split table headers", function () {
			var desc = [
				{
					stack: [] as unknown[],
				},
				{
					table: {
						header: { rows: [["a1\na2", "b1\nb2", "c1\nc2"]], layout: emptyTableLayout },
						widths: "auto",
						body: { groups: [{ rows: [["a", "b", "c"]] }], layout: emptyTableLayout },
					},
				},
			];

			for (var i = 0; i < 59; i++) {
				desc[0].stack!.push("sample line");
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 59);
			assert.equal(pages[1].items.length, 9);
		});

		it("should not split multi-row headers", function () {
			var desc = [
				{
					stack: [] as unknown[],
				},
				{
					table: {
						header: {
							rows: [
								["a1", "b1", "c1"],
								["a2", "b2", "c2"],
							],
							layout: emptyTableLayout,
						},

						widths: "auto",
						body: { groups: [{ rows: [["a", "b", "c"]] }], layout: emptyTableLayout },
					},
				},
			];

			for (var i = 0; i < 59; i++) {
				desc[0].stack!.push("sample line");
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 59);
			assert.equal(pages[1].items.length, 9);
		});

		it("should repeat table headers", function () {
			var desc = [
				{
					table: {
						header: { rows: [["h1", "h2", "h3"]], layout: emptyTableLayout },
						widths: "auto",
						body: { groups: [{ rows: [] as unknown[][] }], layout: emptyTableLayout },
					},
				},
			];

			for (var i = 0; i < 590; i++) {
				desc[0].table.body.groups[0].rows.push(["a", "b", "c"]);
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 10);
			pages.forEach(function (page) {
				assert.equal(page.items[0].item.inlines[0].text, "h1");
				assert.equal(page.items[0].item.y, 40);
				assert.equal(page.items[0].item.x, 40);
			});
		});

		it("should not change x positions of repeated table headers, if context.x has changed (bugfix)", function () {
			var desc = [
				{
					table: {
						header: { rows: [["h1", "h2", "h3"]], layout: emptyTableLayout },
						widths: "auto",
						body: {
							groups: [
								{
									rows: [
										[
											{
												ul: [],
											},
											"b",
											"c",
										],
									],
								},
							],
							layout: emptyTableLayout,
						},
					},
				},
			];

			for (var i = 0; i < 100; i++) {
				(desc[0].table.body.groups[0].rows[0][0] as { ul: string[] }).ul.push("item");
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items[0].item.x, 40);
			assert(pages[0].items[4].item.x > 40);
			assert.equal(pages[1].items[0].item.x, 40);
		});
	});
});
