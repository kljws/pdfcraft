import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The adapter entry (`@pdfcraft/core/adapter`) is the platform-neutral contract used by the
 * browser package. Everything it reaches at runtime must run without Node.js.
 */
const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** External runtime dependencies the shared code may use. The browser build aliases `pdfkit`. */
const ALLOWED_EXTERNALS = new Set(["pdfkit", "linebreak"]);

const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

/**
 * Module specifiers of the statements that exist at runtime. Type-only imports and exports are
 * erased by TypeScript and ignored; `import { type A, B }` still loads the module.
 */
function runtimeSpecifiers(source: string): string[] {
	const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
	const specifiers: string[] = [];
	const statement = /\b(import|export)\s+(type\s+)?([^;]*?)\bfrom\s*["']([^"']+)["']/g;
	for (const match of code.matchAll(statement)) {
		if (!match[2]) specifiers.push(match[4]);
	}
	for (const match of code.matchAll(/\bimport\s*["']([^"']+)["']/g)) specifiers.push(match[1]);
	for (const match of code.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
		specifiers.push(match[1]);
	}
	for (const match of code.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)) {
		specifiers.push(match[1]);
	}
	return specifiers;
}

function resolveSource(fromFile: string, specifier: string): string {
	const base = resolve(dirname(fromFile), specifier);
	for (const candidate of [base, `${base}.ts`, resolve(base, "index.ts")]) {
		if (candidate.endsWith(".ts") && existsSync(candidate)) return candidate;
	}
	throw new Error(`Cannot resolve ${specifier} from ${relative(SOURCE_ROOT, fromFile)}`);
}

/** Walks the runtime import graph from `entry` and returns reached sources and externals. */
function walk(entry: string): { files: Set<string>; externals: Map<string, string> } {
	const files = new Set<string>();
	const externals = new Map<string, string>();
	const pending = [resolve(SOURCE_ROOT, entry)];
	while (pending.length > 0) {
		const file = pending.pop()!;
		if (files.has(file)) continue;
		files.add(file);
		for (const specifier of runtimeSpecifiers(readFileSync(file, "utf8"))) {
			if (specifier.startsWith(".")) {
				pending.push(resolveSource(file, specifier));
			} else if (!externals.has(specifier)) {
				externals.set(specifier, relative(SOURCE_ROOT, file));
			}
		}
	}
	return { files: new Set([...files].map((file) => relative(SOURCE_ROOT, file))), externals };
}

describe("adapter entry boundary", () => {
	const adapter = walk("adapter.ts");

	it("reaches no Node.js built-in module at runtime", () => {
		const builtins = [...adapter.externals]
			.filter(([specifier]) => NODE_BUILTINS.has(specifier))
			.map(([specifier, from]) => `${from} -> ${specifier}`);
		expect(builtins).toEqual([]);
	});

	it("reaches only the intended external dependencies", () => {
		const unexpected = [...adapter.externals]
			.filter(([specifier]) => !ALLOWED_EXTERNALS.has(specifier))
			.map(([specifier, from]) => `${from} -> ${specifier}`);
		expect(unexpected).toEqual([]);
		expect([...adapter.externals.keys()].sort()).toEqual([...ALLOWED_EXTERNALS].sort());
	});

	it("cannot reach the server output or the Node entry", () => {
		expect(adapter.files.has("output/output-document.server.ts")).toBe(false);
		expect(adapter.files.has("index.ts")).toBe(false);
	});

	it("detects Node built-ins through the Node entry, proving the walk is not blind", () => {
		const node = walk("index.ts");
		expect(node.files.has("output/output-document.server.ts")).toBe(true);
		expect([...node.externals.keys()]).toEqual(expect.arrayContaining(["node:fs", "node:buffer"]));
	});

	it("recognizes runtime and type-only statements", () => {
		expect(
			runtimeSpecifiers(`
				import type { A } from "type-only";
				export type { B } from "type-export";
				import { type C, D } from "mixed";
				import fs from "fs";
				import "side-effect";
				// import x from "commented";
				const lazy = () => import("dynamic");
			`),
		).toEqual(["mixed", "fs", "side-effect", "dynamic"]);
	});
});
