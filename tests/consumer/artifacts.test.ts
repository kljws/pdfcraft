import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Checks the built and publishable artifacts, which source import rules cannot see: what the
 * bundler included, what Node.js actually loads, and what `npm pack` would publish.
 * Runs after `pnpm run build`.
 */
const root = fileURLToPath(new URL("../../", import.meta.url));
const packageDirectory = (name: string) => `${root}packages/${name}`;
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

interface PackageManifest {
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

/** Files `npm pack` would publish, without running lifecycle scripts. */
function publishedFiles(name: string): string[] {
	const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
		cwd: packageDirectory(name),
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
	});
	const report = JSON.parse(output) as
		| Array<{ files: Array<{ path: string }> }>
		| Record<string, { files: Array<{ path: string }> }>;
	const [entry] = Array.isArray(report) ? report : Object.values(report);
	return entry.files.map((file) => file.path).sort();
}

/** Runs `script` in a fresh Node.js process and returns what it printed. */
function runNode(args: string[]): string {
	return execFileSync(process.execPath, args, { cwd: root, encoding: "utf8" });
}

const ESM_RESOLUTION_PROBE = `
import { register } from "node:module";
const hook = \`export async function resolve(specifier, context, next) {
	const result = await next(specifier, context);
	if (/\\\\/(pdfkit|browser)\\\\//.test(result.url)) process.stdout.write(result.url + "\\\\n");
	return result;
}\`;
register("data:text/javascript," + encodeURIComponent(hook));
await import(process.argv[1]);
`;

describe("published artifacts", () => {
	describe("core (Node.js)", () => {
		it("declares only its own runtime dependencies", () => {
			const manifest = readJson<PackageManifest>(`${packageDirectory("core")}/package.json`);
			expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(["linebreak", "pdfkit"]);
			expect(manifest.peerDependencies).toBeUndefined();
			expect(manifest.optionalDependencies).toBeUndefined();
		});

		it("loads the regular PDFKit build from the ESM entry", () => {
			const loaded = runNode([
				"--input-type=module",
				"-e",
				ESM_RESOLUTION_PROBE,
				`${packageDirectory("core")}/dist/index.mjs`,
			])
				.trim()
				.split("\n");
			expect(loaded).toHaveLength(1);
			expect(loaded[0]).toMatch(/\/pdfkit\/js\/pdfkit\.node\.mjs$/);
		});

		it("loads the regular PDFKit build from the CommonJS entry", () => {
			const loaded = JSON.parse(
				runNode([
					"-e",
					"require(process.argv[1]); console.log(JSON.stringify(Object.keys(require.cache).filter((key) => /[\\\\/](pdfkit|browser)[\\\\/]/.test(key))))",
					`${packageDirectory("core")}/dist/index.cjs`,
				]),
			) as string[];
			expect(loaded).toHaveLength(1);
			expect(loaded[0]).toMatch(/[\\/]pdfkit[\\/]js[\\/]pdfkit\.js$/);
		});

		it("publishes only its build output, without standalone PDFKit", () => {
			const files = publishedFiles("core");
			expect(
				files.filter((file) => !/^dist\/[\w.-]+\.(mjs|cjs|d\.mts|d\.cts|d\.ts)$/.test(file)),
			).toEqual(["LICENSE", "README.md", "package.json"]);
			for (const file of files.filter((path) => path.endsWith("js"))) {
				expect(readFileSync(`${packageDirectory("core")}/${file}`, "utf8")).not.toContain(
					"pdfkit.standalone",
				);
			}
		});
	});

	describe("browser", () => {
		interface ChunkMetadata {
			fileName: string;
			modules: string[];
			imports: string[];
			dynamicImports: string[];
		}
		const metadata = () =>
			readJson<ChunkMetadata[]>(`${root}private/build-metadata/browser.json`).find(
				(chunk) => chunk.fileName === "index.js",
			)!;

		it("declares no runtime dependencies because the bundle is self-contained", () => {
			const manifest = readJson<PackageManifest>(`${packageDirectory("browser")}/package.json`);
			expect(manifest.dependencies).toBeUndefined();
			expect(manifest.peerDependencies).toBeUndefined();
			expect(manifest.optionalDependencies).toBeUndefined();
		});

		it("bundles the standalone PDFKit build and no other PDFKit distribution", () => {
			const pdfkit = metadata().modules.filter((module) => module.includes("/pdfkit/"));
			expect(pdfkit).toHaveLength(1);
			expect(pdfkit[0]).toMatch(/\/pdfkit\/js\/pdfkit\.standalone\.js$/);
		});

		it("leaves no import unresolved, including Node.js built-ins", () => {
			expect(metadata().imports).toEqual([]);
			expect(metadata().dynamicImports).toEqual([]);
		});

		it("bundles the shared adapter code but not the Node entry or server output", () => {
			const modules = metadata().modules;
			// The adapter entry only re-exports; the bundle holds the modules it points to.
			expect(modules).toContain("packages/core/src/core/pdfcraft.ts");
			expect(modules).toContain("packages/core/src/output/output-document.ts");
			expect(modules).not.toContain("packages/core/src/index.ts");
			expect(modules).not.toContain("packages/core/src/output/output-document.server.ts");
		});

		it("publishes only the bundle and its declarations", () => {
			expect(publishedFiles("browser")).toEqual([
				"LICENSE",
				"README.md",
				"dist/index.d.ts",
				"dist/index.js",
				"package.json",
			]);
		});
	});
});
