import { assert } from "vitest";
import type { MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal.ts";

/** Asserts a preprocessed node's kind and narrows it to that kind's node shape. */
export function expectPreprocessedKind<Kind extends PreprocessedPdfNode["_kind"]>(
	node: PreprocessedPdfNode,
	kind: Kind,
): Extract<PreprocessedPdfNode, { _kind: Kind }> {
	assert.equal(node._kind, kind);
	return node as Extract<PreprocessedPdfNode, { _kind: Kind }>;
}

/** Asserts a measured node's kind and narrows it to that kind's node shape. */
export function expectMeasuredKind<Kind extends MeasuredPdfNode["_kind"]>(
	node: MeasuredPdfNode,
	kind: Kind,
): Extract<MeasuredPdfNode, { _kind: Kind }> {
	assert.equal(node._kind, kind);
	return node as Extract<MeasuredPdfNode, { _kind: Kind }>;
}
