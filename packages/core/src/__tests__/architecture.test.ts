import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Layers that must stay feature-neutral (docs/ARCHITECTURE.md, "Dépendances autorisées"). */
const NEUTRAL_LAYERS = ["document", "engine", "layout", "services", "types", "utils"];

/** Orchestration entry points inside neutral layers, allowed to import composed facades. */
const ORCHESTRATION_FILES = new Set(["layout/layout-builder.ts"]);

const IMPORT_PATTERN = /(?:from\s+|import\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g;

function listSourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			return entry.name === "__tests__" || entry.name === "node_modules"
				? []
				: listSourceFiles(path);
		}
		return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") ? [path] : [];
	});
}

function listImports(file: string): string[] {
	const source = readFileSync(file, "utf8");
	return [...source.matchAll(IMPORT_PATTERN)].map((match) =>
		relative(SOURCE_ROOT, resolve(dirname(file), match[1])),
	);
}

function findViolations(): string[] {
	const violations: string[] = [];
	for (const file of listSourceFiles(SOURCE_ROOT)) {
		const source = relative(SOURCE_ROOT, file);
		const [layer, feature] = source.split("/");
		for (const target of listImports(file)) {
			const [targetLayer, targetFeature] = target.split("/");
			if (layer === "features" && targetLayer === "features" && targetFeature !== feature) {
				violations.push(`${source} -> features/${targetFeature}/`);
			}
			if (
				NEUTRAL_LAYERS.includes(layer) &&
				!ORCHESTRATION_FILES.has(source) &&
				["features", "composition"].includes(targetLayer)
			) {
				violations.push(`${source} -> ${targetLayer}/`);
			}
		}
	}
	return [...new Set(violations)];
}

const SHARED_NODE_STATE = ["PreprocessedNodeState", "MeasuredNodeState", "LayoutNodeState"];

function listSharedNodeStateFields(): string[] {
	const source = readFileSync(join(SOURCE_ROOT, "types/document.types.ts"), "utf8");
	return SHARED_NODE_STATE.flatMap((name) => {
		const body = source.match(new RegExp(`interface ${name}(?:<[^>]*>)? \\{([^}]*)\\}`))?.[1] ?? "";
		return [...body.matchAll(/^\s*(\w+)\??:/gm)].map((match) => match[1]);
	});
}

/** Owner of a source file: its feature for feature code, otherwise its top-level layer. */
function ownerOf(file: string): string {
	const [layer, feature] = relative(SOURCE_ROOT, file).split("/");
	return layer === "features" ? `features/${feature}` : layer;
}

function findFeatureOwnedSharedFields(): string[] {
	const sources = listSourceFiles(SOURCE_ROOT)
		.filter((file) => ownerOf(file) !== "types")
		.map((file) => ({ owner: ownerOf(file), source: readFileSync(file, "utf8") }));
	return listSharedNodeStateFields().flatMap((field) => {
		const pattern = new RegExp(`\\b${field}\\b`);
		const owners = new Set(
			sources.filter(({ source }) => pattern.test(source)).map(({ owner }) => owner),
		);
		const [owner] = owners;
		return owners.size === 1 && owner.startsWith("features/") ? [`${field} (${owner})`] : [];
	});
}

describe("core architecture", () => {
	it("keeps features independent and neutral layers free of features and composition", () => {
		expect(findViolations()).toEqual([]);
	});

	it("keeps shared node state free of fields owned by a single feature", () => {
		expect(findFeatureOwnedSharedFields()).toEqual([]);
	});
});
