import { describe, expect, it, vi } from "vitest";
import { dispatchNodeStage, type NodeStageHandler } from "../node-stage-dispatcher";

type TestNode = { _kind?: string; text?: string; table?: object };

function handler(
	kind: string,
	matches: (node: TestNode) => boolean,
): NodeStageHandler<TestNode, undefined, string> {
	return { kind, matches, process: () => kind };
}

describe("dispatchNodeStage", () => {
	it("preserves ordered first-match dispatch for public nodes", () => {
		const result = dispatchNodeStage(
			{ text: "Invoice", table: {} },
			undefined,
			[handler("table", (node) => Boolean(node.table)), handler("text", (node) => Boolean(node.text))],
		);

		expect(result).toEqual({ handled: true, kind: "table", value: "table" });
	});

	it("dispatches preprocessed nodes by kind without calling matches", () => {
		const tableMatches = vi.fn(() => false);
		const textMatches = vi.fn(() => true);

		const result = dispatchNodeStage(
			{ _kind: "table", text: "ambiguous" },
			undefined,
			[handler("text", textMatches), handler("table", tableMatches)],
		);

		expect(result).toEqual({ handled: true, kind: "table", value: "table" });
		expect(textMatches).not.toHaveBeenCalled();
		expect(tableMatches).not.toHaveBeenCalled();
	});

	it("does not fall back to first-match when a kind is unknown", () => {
		const matches = vi.fn(() => true);

		expect(
			dispatchNodeStage({ _kind: "unknown", text: "Invoice" }, undefined, [handler("text", matches)]),
		).toEqual({ handled: false });
		expect(matches).not.toHaveBeenCalled();
	});
});
