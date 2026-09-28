import { beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { renderReference } from "../../__tests__/fixtures/reference-render.ts";

describe("structural input validation", () => {
	let warn: MockInstance<typeof console.warn>;
	beforeEach(() => {
		warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	it("rejects a node that contains itself and names the cycle", async () => {
		const section: Record<string, unknown> = { stack: ["a"], id: "loop" };
		(section.stack as unknown[]).push({ columns: [section] });
		await expect(renderReference({ content: section })).rejects.toThrow(
			"Cyclic document structure: a node contains itself (stack 'loop' > columns > stack 'loop')",
		);
	});

	it("rejects cycles through text fragments and table cells", async () => {
		const text: Record<string, unknown> = { text: ["x"] };
		(text.text as unknown[]).push(text);
		await expect(renderReference({ content: text })).rejects.toThrow(/Cyclic document structure/);

		const table: Record<string, unknown> = {};
		table.table = { body: { groups: [{ rows: [["a", table]] }] } };
		await expect(renderReference({ content: table })).rejects.toThrow(/Cyclic document structure/);
	});

	it("accepts the same node used several times", async () => {
		const shared = { text: "shared" };
		const { layout } = await renderReference({ content: [shared, shared, { stack: [shared] }] });
		expect(layout[0].items.map((item) => (item as { text?: string }).text)).toEqual([
			"shared",
			"shared",
			"shared",
		]);
	});

	it("rejects a page reference to a missing id before layout", async () => {
		await expect(
			renderReference({ content: [{ text: ["See ", { pageReference: "missing" }] }] }),
		).rejects.toThrow(
			"Unresolved pageReference 'missing': no node in the same content has id 'missing'",
		);
	});

	it("allows forward references", async () => {
		const { layout } = await renderReference({
			content: [{ text: ["See ", { pageReference: "later" }] }, { text: "Later", id: "later" }],
		});
		expect(layout[0].items[0]).toMatchObject({ text: "See 1" });
	});

	it("keeps rendering a missing text reference as empty text and reports it once", async () => {
		const footer = () => "footer";
		const { layout } = await renderReference({
			footer,
			content: [{ text: ["T", { textReference: "missing" }] }],
		});
		expect(layout[0].items[0]).toMatchObject({ text: "T" });
		expect(warn.mock.calls.map((call) => call[0])).toEqual([
			"Unresolved textReference 'missing': no node has id 'missing'; it renders as empty text",
		]);
	});
});
