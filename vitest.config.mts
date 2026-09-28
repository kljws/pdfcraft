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

// Unit tests are `.test.ts` files and integration tests `.integ.ts` files, both colocated in
// `__tests__` directories. Packages not yet migrated keep integration tests in their own
// `tests/integration` directory. Consumer checks run against the built packages, after
// `pnpm build`. Browser tests use `vitest-browser.config.mts`.
export default defineConfig({
	test: {
		...testConfig,
		projects: [
			{ extends: true, test: { name: "unit", include: ["packages/*/src/**/*.test.ts"] } },
			{
				extends: true,
				test: {
					name: "integration",
					include: ["packages/*/src/**/*.integ.ts", "packages/*/tests/integration/**/*.test.ts"],
				},
			},
			{ extends: true, test: { name: "consumer", include: ["tests/consumer/**/*.test.ts"] } },
		],
	},
});
