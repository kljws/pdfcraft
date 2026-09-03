import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";

const pdfkitDirectory = dirname(fileURLToPath(import.meta.resolve("pdfkit")));

export default defineConfig([
	{
		entry: "src/index.ts",
		outDir: "dist",
		format: ["esm", "cjs"],
		platform: "node",
		target: "node22",
		clean: true,
		cjsDefault: true,
		dts: true,
		sourcemap: false,
	},
	{
		entry: { types: "src/types/index.ts" },
		outDir: "dist",
		format: "esm",
		platform: "neutral",
		clean: false,
		dts: { emitDtsOnly: true },
		sourcemap: false,
	},
	{
		entry: { browser: "src/browser/index.ts" },
		outDir: "dist",
		format: "esm",
		platform: "browser",
		target: "es2020",
		minify: true,
		clean: false,
		dts: true,
		sourcemap: false,
		deps: {
			alwaysBundle: [/.*/],
			onlyBundle: false,
		},
		alias: {
			pdfkit: resolve(pdfkitDirectory, "pdfkit.standalone.js"),
		},
	},
]);
