import { defineConfig, type ViteUserConfig } from "vitest/config";

export const testConfig = {
	globals: false,
	clearMocks: true,
	restoreMocks: true,
	coverage: {
		provider: "v8",
		reportsDirectory: "private/coverage",
		reporter: ["text", "json-summary", "html"],
		include: ["packages/*/src/**/*.ts"],
		exclude: [
			"packages/**/src/**/__tests__/**",
			"packages/browser/src/**",
			"packages/core/src/types/**",
			"packages/core/src/vendor/**",
			"packages/**/src/**/*.types.ts",
		],
		thresholds: {
			statements: 78,
			branches: 65,
			functions: 84,
			lines: 78,
		},
	},
} satisfies NonNullable<ViteUserConfig["test"]>;

export default defineConfig({
	test: testConfig,
});
