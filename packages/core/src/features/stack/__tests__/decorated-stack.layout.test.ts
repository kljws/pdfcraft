import { assert, describe, it } from "vitest";
import {
	createLayoutBuilder,
	sampleTestProvider,
} from "../../../__tests__/fixtures/layout-builder.ts";
import type { PdfPage, Vector } from "../../../types/internal.ts";

const decoration = {
	borderWidth: 2,
	borderColor: "#334155",
	backgroundColor: "#f8fafc",
	padding: 6,
};

const vectorsOf = (pages: unknown): Vector[] =>
	(pages as PdfPage[])
		.flatMap((page) => page.items)
		.flatMap((entry) => (entry.type === "vector" ? [entry.item] : []));

describe("decorated stack layout", function () {
	it("draws its decoration from stack properties, not inherited table-cell properties", function () {
		const pages = createLayoutBuilder().layoutDocument(
			{
				table: {
					widths: ["*"],
					body: {
						groups: [
							{
								rows: [
									[
										{
											fillColor: "yellow",
											fillOpacity: 0.5,
											border: [false, false, false, false],
											borderColor: ["red", "red", "red", "red"],
											stack: [
												{
													stack: [
														{
															table: {
																widths: ["*"],
																body: { groups: [{ rows: [["inner cell"]] }] },
															},
														},
													],
													...decoration,
												},
											],
										},
									],
								],
							},
						],
					},
				},
			},
			sampleTestProvider,
		);
		const vectors = vectorsOf(pages);
		const fills = vectors.filter((vector) => vector.type === "rect");

		// The stack is filled with its own background, fully opaque.
		assert.deepEqual(
			fills.filter((vector) => vector.color === "#f8fafc").map((vector) => vector.fillOpacity),
			[1],
		);
		// Its four borders use its own color, despite the inherited border and border color.
		assert.equal(vectors.filter((vector) => vector.lineColor === "#334155").length, 4);
		assert.equal(vectors.filter((vector) => vector.lineColor === "red").length, 0);
		// A table inside the stack still inherits the cell fill: outer cell and inner cell.
		assert.equal(fills.filter((vector) => vector.color === "yellow").length, 2);
	});

	it("is reported once to pageBreakBefore, as a stack, with its children", function () {
		const seen: Array<Record<string, unknown>> = [];
		createLayoutBuilder().layoutDocument(
			{ id: "frame", stack: ["first", { id: "nested", stack: ["nested text"] }], ...decoration },
			sampleTestProvider,
			{},
			{},
			undefined,
			undefined,
			undefined,
			undefined,
			(node: Record<string, unknown>) => {
				seen.push(node);
				return false;
			},
		);

		assert.deepEqual(
			seen.map((node) => ({ id: node.id, stack: node.stack, text: node.text })),
			[
				{ id: "frame", stack: true, text: undefined },
				{ id: undefined, stack: false, text: "first" },
				{ id: "nested", stack: true, text: undefined },
				{ id: undefined, stack: false, text: "nested text" },
			],
		);
		assert.ok(seen.every((node) => !("table" in node)));
	});

	it("lets a leading root section establish the first page before framing it", function () {
		const pages = createLayoutBuilder().layoutDocument(
			{
				stack: [
					{ section: ["in section"], pageSize: { width: 300, height: 500 }, pageMargins: 20 },
					"after",
				],
				...decoration,
			},
			sampleTestProvider,
		) as unknown as PdfPage[];
		const [page] = pages;
		const firstLine = page?.items.find((entry) => entry.type === "line");

		assert.equal(pages.length, 1);
		assert.equal(page?.pageSize.width, 300);
		assert.equal(page?.pageSize.height, 500);
		// Content starts inside the section's margin, border and padding: 20 + 2 + 6.
		assert.equal(firstLine?.item?.x, 28);
		assert.equal(firstLine?.item?.y, 28);
	});
});
