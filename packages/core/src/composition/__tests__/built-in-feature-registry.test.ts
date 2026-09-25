import { describe, expect, it } from "vitest";
import type { PdfNode } from "../../types/internal";
import {
	builtInFeatureRegistry,
	builtInFeatures,
	createNodeFeatureRegistry,
	getBuiltInFeatureByKind,
} from "../built-in-feature-registry";

describe("built-in feature registry", () => {
	it("preserves the established matching order", () => {
		expect(builtInFeatures.map((feature) => feature.kind)).toEqual([
			"section",
			"columns",
			"stack",
			"list",
			"table",
			"text",
			"toc",
			"image",
			"canvas",
			"attachment",
			"acroform",
		]);
	});

	it("dispatches by kind from the same collection", () => {
		expect(getBuiltInFeatureByKind("image")?.kind).toBe("image");
		expect(getBuiltInFeatureByKind("missing")).toBeUndefined();
		expect(builtInFeatureRegistry.dispatch({ _kind: "attachment" })?.kind).toBe("attachment");
		expect(builtInFeatureRegistry.dispatch({ _kind: "missing", image: "ignored" })).toBeUndefined();
	});

	it("rejects duplicate kinds when the registry is created", () => {
		const feature = { kind: "duplicate", matches: (_node: PdfNode) => false };
		expect(() => createNodeFeatureRegistry([feature, feature])).toThrow(
			"Duplicate node feature kind 'duplicate'",
		);
	});

	it("rejects ambiguous public nodes but dispatches preprocessed nodes by kind", () => {
		expect(() =>
			builtInFeatureRegistry.dispatch({ table: {}, text: "ambiguous" } as PdfNode),
		).toThrow("Ambiguous document node matches 'table', 'text'");
		expect(
			builtInFeatureRegistry.dispatch({ _kind: "table", table: {}, text: "normalized" } as PdfNode)
				?.kind,
		).toBe("table");
	});
});
