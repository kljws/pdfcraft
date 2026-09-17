import { assert, describe, it } from "vitest";
import StyleContextStack from "../../../services/styles/style-context-stack.ts";
import { measureCanvas } from "../measure-canvas.ts";
import type { MeasuredCanvasNode } from "../canvas.types.ts";

describe("Canvas measurement", function () {
	it("measures translated path commands", function () {
		const result = measureCanvas(
			{ canvas: [{ type: "path", d: "M 5 10 L 30 40", x: 7, y: 11 }] } as MeasuredCanvasNode,
			new StyleContextStack(),
		);

		assert.equal(result._minWidth, 37);
		assert.equal(result._minHeight, 51);
	});
});
