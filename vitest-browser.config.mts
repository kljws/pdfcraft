import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { testConfig } from "./vitest.config.mts";

export default defineConfig({
	test: {
		...testConfig,
		include: ["packages/browser/tests/**/*.test.ts"],
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [
				{
					browser: "chromium",
				},
			],
		},
	},
});
