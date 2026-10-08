import { describe, expect, it } from "vitest";
import type { PdfNode } from "../../types/internal";
import {
	builtInFeatures,
	createFeatureDispatch,
	indexFeaturesByKind,
} from "../built-in-feature-registry";

const dispatch = createFeatureDispatch([]);

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
		expect(dispatch({ _kind: "image" })?.kind).toBe("image");
		expect(dispatch({ _kind: "extension" })?.kind).toBe("extension");
		expect(dispatch({ _kind: "attachment" })?.kind).toBe("attachment");
		expect(dispatch({ _kind: "missing", image: "ignored" })).toBeUndefined();
	});

	it("rejects duplicate kinds when the registry is created", () => {
		const feature = { kind: "duplicate", matches: (_node: PdfNode) => false };
		expect(() => indexFeaturesByKind([feature, feature])).toThrow(
			"Duplicate node feature kind 'duplicate'",
		);
	});

	it("rejects ambiguous public nodes but dispatches preprocessed nodes by kind", () => {
		expect(() => dispatch({ table: {}, text: "ambiguous" } as PdfNode)).toThrow(
			"Ambiguous document node matches 'table', 'text'",
		);
		expect(
			dispatch({
				_kind: "table",
				table: { body: [], widths: [] },
				text: "normalized",
			} as PdfNode)?.kind,
		).toBe("table");
	});
});
