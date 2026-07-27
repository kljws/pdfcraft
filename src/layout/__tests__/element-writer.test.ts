import { assert, beforeEach, describe, it } from "vitest";
import type DocumentContext from "../../document/document-context.ts";
import ElementWriter, { trackVectorInsertion } from "../element-writer.ts";
import type { CurrentPosition, LineLike, PageItem, PdfPage, Vector } from "../../types/internal.ts";

interface TestPage {
	items: Array<{ item: { x?: number; y?: number } }>;
}

interface TestFragment {
	height: number;
	items: PageItem[];
}

describe("ElementWriter", function () {
	var ew: ElementWriter;
	var ctx: DocumentContext;
	var page: TestPage;
	var fakePosition: CurrentPosition;

	beforeEach(function () {
		fakePosition = { fake: "position" } as unknown as CurrentPosition;
		page = { items: [] };
		ctx = {
			x: 10,
			y: 20,
			availableWidth: 100,
			availableHeight: 100,
			getCurrentPage: function () {
				return page;
			},
			getCurrentPosition: function () {
				return fakePosition;
			},
			moveDown: function (offset: number) {
				ctx.y += offset;
				ctx.availableHeight -= offset;
			},
		} as unknown as DocumentContext;
		ew = new ElementWriter(ctx);
	});

	function buildLine(height: number, alignment?: string, x?: number, y?: number): LineLike {
		const line = {
			getHeight: function () {
				return height;
			},
			getWidth: function () {
				return 60;
			},
			clone: function () {
				return { ...this };
			},
			inlines: [
				{
					alignment: alignment,
					x: 0,
				},
				{
					x: 30,
				},
				{
					x: 50,
				},
			],
			x: x,
			y: y,
		};

		return line as unknown as LineLike;
	}

	describe("addLine", function () {
		it("should add lines to the current page if there's enough space", function () {
			var line = buildLine(20);

			var position = ew.addLine(line);

			assert.equal(page.items.length, 1);
			assert.equal(position, fakePosition);
		});

		it("should return position on page", function () {
			var line = buildLine(20);

			ew.pushContext(50, 50);
			ew.pushContext(20, 30);
			ew.pushContext(11, 40);
			var position = ew.addLine(line);

			assert.equal(position, fakePosition);
		});

		it("should not add line and return false if there's not enough space", function () {
			var line = buildLine(120);

			assert(!ew.addLine(line));
			assert.equal(page.items.length, 0);
		});

		it("should set line.x and line.y to current context's values", function () {
			var line = buildLine(30);

			ew.addLine(line);
			assert.equal(line.x, 10);
			assert.equal(line.y, 20);
		});

		it("should update context.y and context.availableHeight", function () {
			ew.addLine(buildLine(30));
			assert.equal(ctx.y, 20 + 30);
			assert.equal(ctx.availableHeight, 100 - 30);
		});

		describe("should support line alignment", function () {
			it("right", function () {
				var line = buildLine(30, "right");
				ew.addLine(line);
				assert.equal(line.x, 10 + 100 - line.getWidth());
			});

			it("center", function () {
				var line = buildLine(30, "center");
				ew.addLine(line);
				assert.equal(line.x, 10 + (100 - line.getWidth()) / 2);
			});

			it("justify", function () {
				var line = buildLine(30, "justify");
				ew.addLine(line);
				assert.equal(line.x, 10);

				var additionalSpacing = (100 - 60) / 2;

				assert.equal(line.inlines[1].x, 30 + additionalSpacing);
				assert.equal(line.inlines[2].x, 50 + 2 * additionalSpacing);
			});
		});
	});

	describe("addVector", function () {
		it("should add vectors to the current page", function () {
			ew.addVector({ type: "rect", x: 10, y: 10 });
			assert.equal(page.items.length, 1);
		});

		it("reports the page item inserted for a tracked vector", function () {
			const vector: Vector = { type: "rect", x: 10, y: 10 };
			let insertedPageItem: PageItem | undefined;
			trackVectorInsertion(vector, (_pageIndex, insertedPage, pageItem) => {
				assert.equal(insertedPage, page as unknown as PdfPage);
				insertedPageItem = pageItem;
			});

			ew.addVector(vector);

			assert.equal(insertedPageItem, page.items[0] as unknown as PageItem);
		});

		it("should offset vectors to the current position", function () {
			var rect: Vector = { type: "rect", x: 10, y: 10 };
			var ellipse: Vector = { type: "ellipse", x: 10, y: 10 };
			var line: Vector = { type: "line", x1: 10, x2: 50, y1: 10, y2: 20 };
			var polyline: Vector = {
				type: "polyline",
				points: [
					{ x: 0, y: 0 },
					{ x: 20, y: 20 },
				],
			};
			var path: Vector = { type: "path", d: "M 10 10 L 20 20" };

			ew.addVector(rect);
			ew.addVector(ellipse);
			ew.addVector(line);
			ew.addVector(polyline);
			ew.addVector(path);

			assert.equal(rect.x, 20);
			assert.equal(rect.y, 30);

			assert.equal(ellipse.x, 20);
			assert.equal(ellipse.y, 30);

			assert.equal(line.x1, 20);
			assert.equal(line.x2, 60);
			assert.equal(line.y1, 30);
			assert.equal(line.y2, 40);

			assert.equal(polyline.points![0].x, 10);
			assert.equal(polyline.points![0].y, 20);
			assert.equal(polyline.points![1].x, 30);
			assert.equal(polyline.points![1].y, 40);

			assert.equal(path.x, 10);
			assert.equal(path.y, 20);
		});
	});

	describe("addFragment", function () {
		var fragment: TestFragment;

		beforeEach(function () {
			fragment = {
				height: 0,
				items: [
					{
						type: "line",
						item: buildLine(30, "left", 10, 10),
					},
					{
						type: "line",
						item: buildLine(30, "left", 10, 50),
					},
					{
						type: "vector",
						item: { type: "rect", x: 10, y: 20 },
					},
					{
						type: "vector",
						item: { type: "rect", x: 40, y: 60 },
					},
				],
			};
		});

		it("should add all fragment vectors and lines", function () {
			ew.addFragment(fragment);

			assert.equal(page.items.length, 4);
		});

		it("should return false if fragment height is larger than available space", function () {
			fragment.height = 120;

			assert(!ew.addFragment(fragment));
		});

		it("should update current position", function () {
			fragment.height = 50;
			ew.addFragment(fragment);

			assert.equal(ctx.y, 20 + 50);
		});

		it("should offset lines and vectors", function () {
			ew.addFragment(fragment);

			assert.equal(page.items[0].item.x, 20);
			assert.equal(page.items[0].item.y, 30);
			assert.equal(page.items[1].item.x, 20);
			assert.equal(page.items[1].item.y, 70);

			assert.equal(page.items[2].item.x, 20);
			assert.equal(page.items[2].item.y, 40);
			assert.equal(page.items[3].item.x, 50);
			assert.equal(page.items[3].item.y, 80);
		});

		it("should not modify original line/vector positions", function () {
			ew.addFragment(fragment);

			assert.equal(fragment.items[0].item!.x, 10);
			assert.equal(fragment.items[0].item!.y, 10);

			assert.equal(fragment.items[3].item!.x, 40);
			assert.equal(fragment.items[3].item!.y, 60);
		});

		it("preserves vector insertion tracking when a fragment is cloned", function () {
			const source = fragment.items[2];
			if (source.type !== "vector") throw new Error("Expected a vector fixture");
			let insertedPageItem: PageItem | undefined;
			trackVectorInsertion(source.item, (_pageIndex, insertedPage, pageItem) => {
				assert.equal(insertedPage, page as unknown as PdfPage);
				insertedPageItem = pageItem;
			});

			ew.addFragment(fragment);

			assert.equal(insertedPageItem, page.items[2] as unknown as PageItem);
			assert.notEqual(insertedPageItem, source);
			if (insertedPageItem?.type !== "vector") throw new Error("Expected a tracked vector");
			assert.notEqual(insertedPageItem.item, source.item);
		});
	});
});
