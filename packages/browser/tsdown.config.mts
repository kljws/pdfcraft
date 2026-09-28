import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const pdfkitDirectory = dirname(fileURLToPath(import.meta.resolve("pdfkit")));
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const metadataFile = resolve(repositoryRoot, "private/build-metadata/browser.json");

/**
 * Records what the bundler actually included, for the artifact checks in tests/consumer.
 * Written outside `dist/` so it is never published.
 */
const recordBuildMetadata = {
	name: "pdfcraft:record-build-metadata",
	generateBundle(_options: unknown, bundle: Record<string, unknown>) {
		const chunks = Object.values(bundle).filter(
			(
				output,
			): output is {
				type: "chunk";
				fileName: string;
				modules: object;
				imports: string[];
				dynamicImports: string[];
			} => (output as { type?: string }).type === "chunk",
		);
		const metadata = chunks.map((chunk) => ({
			fileName: chunk.fileName,
			modules: Object.keys(chunk.modules)
				.map((id) => relative(repositoryRoot, id.replace(/^\0/, "")))
				.sort(),
			imports: chunk.imports,
			dynamicImports: chunk.dynamicImports,
		}));
		mkdirSync(dirname(metadataFile), { recursive: true });
		writeFileSync(metadataFile, `${JSON.stringify(metadata, null, "\t")}\n`);
	},
};

export default defineConfig({
	entry: "src/index.ts",
	outDir: "dist",
	format: "esm",
	platform: "browser",
	target: "es2020",
	minify: true,
	clean: true,
	dts: true,
	sourcemap: false,
	deps: {
		alwaysBundle: [/.*/],
		dts: {
			alwaysBundle: [/.*/],
		},
		onlyBundle: false,
	},
	plugins: [recordBuildMetadata],
	alias: {
		pdfkit: resolve(pdfkitDirectory, "pdfkit.standalone.js"),
	},
});
