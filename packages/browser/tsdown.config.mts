import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const pdfkitDirectory = dirname(fileURLToPath(import.meta.resolve("pdfkit")));

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
	alias: {
		pdfkit: resolve(pdfkitDirectory, "pdfkit.standalone.js"),
	},
});
