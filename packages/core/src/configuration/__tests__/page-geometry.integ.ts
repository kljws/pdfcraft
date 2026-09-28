import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderReference } from "../../__tests__/fixtures/reference-render.ts";

const render = (definition: Record<string, unknown>) =>
	renderReference({ content: ["hello", "world"], ...definition });

describe("document geometry validation", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it.each([
		[{ pageSize: { width: -100, height: 500 } }, /Invalid pageSize\.width: .* received -100/],
		[{ pageSize: { width: 300, height: Number.NaN } }, /Invalid pageSize\.height: .* received NaN/],
		[{ pageSize: { width: 300, height: 0 } }, /Invalid pageSize\.height/],
		[{ pageSize: { width: 300 } }, /Invalid pageSize\.height: .* received undefined/],
		[{ pageMargins: [-10, 10, 10, 10] }, /Invalid pageMargins\.left: .* received -10/],
		[{ pageMargins: [10, Number.NaN, 10, 10] }, /Invalid pageMargins\.top: .* received NaN/],
		[{ pageMargins: { left: 10 } }, /Invalid pageMargins\.top: .* received undefined/],
		[{ pageMargins: [1, 2, 3] }, /Invalid pageMargins: .* received an array of 3/],
		[
			{ pageSize: "A6", pageMargins: [200, 10, 200, 10] },
			/Invalid pageMargins: left \(200\) and right \(200\) margins leave no usable width/,
		],
		[
			{ pageSize: "A6", pageMargins: [10, 300, 10, 300] },
			/Invalid pageMargins: top \(300\) and bottom \(300\) margins leave no usable height/,
		],
		[
			{ pageSize: { width: 300, height: "auto" }, pageMargins: [200, 10, 200, 10] },
			/no usable width on a page 300 wide/,
		],
		[
			{ pageMargins: () => [10, 900, 10, 10] },
			/Invalid pageMargins for page 1: top \(900\) and bottom \(10\) margins leave no usable height/,
		],
		[
			{ pageSize: { width: 300, height: "auto" }, pageOrientation: "landscape" },
			/Invalid pageOrientation: 'landscape' cannot be combined with pageSize\.height 'auto'/,
		],
		[
			{
				pageSize: { width: 300, height: "auto" },
				content: ["a", { text: "b", pageBreak: "before", pageOrientation: "landscape" }],
			},
			/Invalid pageOrientation: 'landscape' cannot be combined/,
		],
		[
			{ pageMargins: () => "x" },
			/Invalid pageMargins for page 1 \(returned by the pageMargins function\)/,
		],
	])("rejects %j before pagination", async (definition, message) => {
		await expect(render(definition)).rejects.toThrow(message);
	});

	it.each([
		[{ pageSize: { width: 300, height: "auto" } }],
		[{ pageSize: { width: 300, height: "auto" }, pageOrientation: "portrait" }],
		[{ pageSize: "A5", pageOrientation: "landscape" }],
		[{ pageSize: "A6", pageMargins: 0 }],
		[{ pageMargins: [20, 30] }],
		[{ pageMargins: { left: 10, top: 10, right: 10, bottom: 10 } }],
	])("accepts %j", async (definition) => {
		const { layout } = await render(definition);
		expect(layout).toHaveLength(1);
	});
});
