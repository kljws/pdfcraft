import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Layers that must stay feature-neutral (docs/ARCHITECTURE-CORE.md, "Dépendances autorisées"). */
const NEUTRAL_LAYERS = ["engine", "services", "types", "utils"];

/**
 * Known exceptions, each to be removed by a planned refactor step. The internal node lifecycle
 * unions still aggregate every feature's node types until node typing is reworked.
 */
const ALLOWED_VIOLATIONS = new Set<string>();

const IMPORT_PATTERN = /(?:from\s+|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g;

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
			if (NEUTRAL_LAYERS.includes(layer) && ["features", "composition"].includes(targetLayer)) {
				violations.push(`${source} -> ${targetLayer}/`);
			}
		}
	}
	return [...new Set(violations)].filter((violation) => !ALLOWED_VIOLATIONS.has(violation));
}

describe("core architecture", () => {
	it("keeps features independent and neutral layers free of features and composition", () => {
		expect(findViolations()).toEqual([]);
	});
});
