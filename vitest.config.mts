import { defineConfig, type ViteUserConfig } from "vitest/config";

export const testConfig = {
	globals: false,
	clearMocks: true,
	restoreMocks: true,
	coverage: {
		provider: "v8",
		reportsDirectory: "private/coverage",
		reporter: ["text", "json-summary", "html"],
		include: ["src/**/*.ts"],
		exclude: [
			"src/**/__tests__/**",
			"src/browser/**",
			"src/output/output-document.browser.ts",
			"src/types/**",
			"src/vendor/**",
			"src/**/*.types.ts",
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
