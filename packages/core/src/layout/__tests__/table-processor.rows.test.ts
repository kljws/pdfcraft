import { describe, expect, it } from "vitest";
import { drawTableRowSegment, type TableRowRenderState } from "../table-processor.rows";
import type PageElementWriter from "../element-writer.page";
import type { Vector } from "../../types/internal";

describe("drawTableRowSegment", () => {
	it("overlaps adjacent fills slightly to prevent viewer seams (#2866)", () => {
		const vectors: Vector[] = [];
		const writer = {
			transactionLevel: 0,
			context: () => ({ page: 0, backgroundLength: [0] }),
			addVector: (vector: Vector) => vectors.push(vector),
		} as unknown as PageElementWriter;
		const processor = {
			tableNode: {
				table: {
					body: [[{ fillColor: "red" }, { fillColor: "blue" }]],
				},
			},
			layout: {
				defaultBorder: false,
				vLineWidth: () => 0,
			},
			rowSpanData: [],
			dontBreakRows: false,
			bottomLineWidth: 0,
			rowPaddingTop: 0,
			rowPaddingBottom: 0,
			reservedAtBottom: 0,
			rowTopPageY: 10,
			drawVerticalLine: () => {},
		} as unknown as TableRowRenderState;

		drawTableRowSegment(
			processor,
			0,
			writer,
			[
				{ x: 0, index: 0 },
				{ x: 50, index: 1 },
				{ x: 100, index: 2 },
			],
			{ y1: 10, y2: 30, willBreak: false, horizontalLineOffset: 0 },
		);

		expect(vectors).toHaveLength(2);
		expect(vectors[0]).toMatchObject({ x: 0, y: 9.5, w: 50.5, h: 21 });
		expect(vectors[1]).toMatchObject({ x: 49.5, y: 9.5, w: 50.5, h: 21 });
	});
});
