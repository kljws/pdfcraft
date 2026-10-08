import { assert, describe, it } from "vitest";
import {
	createLayoutBuilder,
	sampleTestProvider,
} from "../../../__tests__/fixtures/layout-builder.ts";
import type { PdfPage, Vector } from "../../../types/internal.ts";

const round = (value: number | undefined): number => Math.round((value ?? 0) * 100) / 100;

describe("table of contents geometry", function () {
	it("keeps whole-row fills and borders under a registered noBorders override", function () {
		// The TOC presents its entries with the `noBorders` layout and keeps every row whole. A caller
		// may replace that layout; its borders and fills then show the row-keeping geometry: fills are
		// inset by the full border width and span the horizontal borders.
		const builder = createLayoutBuilder();
		builder.registerTableLayouts({
			noBorders: {
				hLineWidth: () => 2,
				vLineWidth: () => 2,
				hLineColor: () => "red",
				vLineColor: () => "red",
				fillColor: () => "#ddeeff",
			},
		});
		const pages = builder.layoutDocument(
			[{ toc: {} }, { text: "Alpha", tocItem: true }, { text: "Beta", tocItem: true }],
			sampleTestProvider,
		) as unknown as PdfPage[];
		const vectors = (pages[0]?.items ?? []).flatMap((entry) =>
			entry.type === "vector" ? [entry.item as Vector] : [],
		);

		// Recorded from the layout before the TOC table moved to the grouped table shape.
		assert.deepEqual(
			vectors.map((vector) =>
				vector.type === "rect"
					? [
							"rect",
							vector.color,
							round(vector.x),
							round(vector.y),
							round(vector.w),
							round(vector.h),
						]
					: [
							vector.type,
							vector.lineColor,
							round(vector.x1),
							round(vector.y1),
							round(vector.x2),
							round(vector.y2),
							vector.lineWidth,
						],
			),
			[
				["rect", "#ddeeff", 42, 60.5, 295.5, 19],
				["rect", "#ddeeff", 337.5, 60.5, 21.5, 19],
				["rect", "#ddeeff", 42, 41.5, 295.5, 19],
				["rect", "#ddeeff", 337.5, 41.5, 21.5, 19],
				["line", "red", 40, 41, 336, 41, 2],
				["line", "red", 336, 41, 358, 41, 2],
				["line", "red", 41, 41, 41, 60, 2],
				["line", "red", 337, 40, 337, 60, 2],
				["line", "red", 359, 41, 359, 60, 2],
				["line", "red", 40, 59, 336, 59, 2],
				["line", "red", 336, 59, 358, 59, 2],
				["line", "red", 41, 59, 41, 78, 2],
				["line", "red", 337, 59, 337, 79, 2],
				["line", "red", 359, 59, 359, 78, 2],
				["line", "red", 40, 78, 336, 78, 2],
				["line", "red", 336, 78, 358, 78, 2],
			],
		);
	});
});
