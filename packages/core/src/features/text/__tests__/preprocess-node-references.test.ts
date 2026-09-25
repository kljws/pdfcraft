import { describe, expect, it } from "vitest";
import type { NodeReference, PreprocessedPdfNode } from "../../../types/internal";
import { preprocessNodeReferences } from "../preprocess-node-references";
import type { PreprocessedTextNode } from "../text.types";

const textNode = (fields: Partial<PreprocessedTextNode>): PreprocessedTextNode => ({
	...fields,
	_kind: "text",
	text: fields.text ?? "",
});

const createContext = (parentNode: PreprocessedPdfNode | null = null) => ({
	parentNode,
	nodeReferences: {} as Record<string, NodeReference<PreprocessedPdfNode>>,
});

describe("preprocessNodeReferences", () => {
	it("resolves a forward page reference through the shared registry entry", () => {
		const context = createContext();
		const reference = textNode({ pageReference: "chapter" });
		preprocessNodeReferences(reference, context);

		expect(reference.text).toBe("00000");
		expect(reference.linkToDestination).toBe("chapter");
		expect(reference._pageRef).toBe(context.nodeReferences.chapter);
		expect(reference._pageRef?._pseudo).toBe(true);

		const target = textNode({ id: "chapter", text: "Chapter" });
		preprocessNodeReferences(target, context);

		expect(reference._pageRef?._nodeRef).toBe(target);
		expect(reference._pageRef?._textNodeRef).toBe(target);
		expect(reference._pageRef?._pseudo).toBe(false);
	});

	it("resolves a forward text reference and preserves destination linking", () => {
		const context = createContext();
		const reference = textNode({ textReference: "caption" });
		preprocessNodeReferences(reference, context);

		expect(reference.text).toBe("");
		expect(reference.linkToDestination).toBe("caption");
		expect(reference._textRef).toBe(context.nodeReferences.caption);

		const target = textNode({ id: "caption", text: "Referenced caption" });
		preprocessNodeReferences(target, context);

		expect(reference._textRef?._textNodeRef).toBe(target);
	});

	it("uses the owning parent as page target for nested text", () => {
		const parent = { text: [] } as unknown as PreprocessedPdfNode;
		const context = createContext(parent);
		const nested = textNode({ id: "nested", text: "Nested" });

		preprocessNodeReferences(nested, context);

		expect(context.nodeReferences.nested._nodeRef).toBe(parent);
		expect(context.nodeReferences.nested._textNodeRef).toBe(nested);
	});

	it("rejects duplicate resolved IDs", () => {
		const context = createContext();
		preprocessNodeReferences(textNode({ id: "duplicate", text: "First" }), context);

		expect(() =>
			preprocessNodeReferences(textNode({ id: "duplicate", text: "Second" }), context),
		).toThrow("Node id 'duplicate' already exists");
	});
});
