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

	it("reports every match so ambiguous public nodes are detectable", () => {
		const node = { table: {}, text: "ambiguous" } as PdfNode;
		expect(builtInFeatureRegistry.matching(node).map((feature) => feature.kind)).toEqual([
			"table",
			"text",
		]);
		expect(builtInFeatureRegistry.match(node)?.kind).toBe("table");
	});

	it("exposes the hooks implemented by each descriptor", () => {
		expect(builtInFeatureRegistry.hooks("attachment")).toEqual([
			"preprocess",
			"resolveResources",
			"measure",
			"layout",
			"place",
			"render",
		]);
		expect(builtInFeatureRegistry.hooks("image")).toEqual([
			"preprocess",
			"measure",
			"layout",
			"place",
			"render",
			"inline",
		]);
		expect(
			builtInFeatureRegistry.withHook("resolveResources").map((feature) => feature.kind),
		).toEqual(["attachment"]);
		expect(builtInFeatureRegistry.withHook("measure")).toEqual([...builtInFeatures]);
		expect(builtInFeatureRegistry.withHook("layout")).toEqual([...builtInFeatures]);
	});
});
