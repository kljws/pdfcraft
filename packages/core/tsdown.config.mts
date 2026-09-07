import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: {
			adapter: "src/adapter.ts",
			index: "src/index.ts",
		},
		outDir: "dist",
		format: ["esm", "cjs"],
		platform: "node",
		target: "node22",
		clean: true,
		cjsDefault: true,
		dts: true,
		sourcemap: false,
		deps: {
			neverBundle: true,
		},
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
]);
