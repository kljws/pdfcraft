import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Keeps the browser bundle from growing unnoticed. Only the minified production JavaScript is
 * measured, in bytes; installed dependency size (such as PDFKit's files on disk) is unrelated.
 */
const browserDirectory = fileURLToPath(new URL("../../packages/browser/", import.meta.url));

interface SizeBudget {
	file: string;
	baselineBytes: number;
	maxBytes: number;
}

const budget = JSON.parse(
	readFileSync(`${browserDirectory}size-budget.json`, "utf8"),
) as SizeBudget;

describe("browser bundle size", () => {
	it("measures the production bundle alone", () => {
		const outputs = readdirSync(`${browserDirectory}dist`);
		expect(outputs.filter((file) => file.endsWith(".js"))).toEqual([
			budget.file.replace("dist/", ""),
		]);
		expect(outputs.filter((file) => file.endsWith(".map"))).toEqual([]);
	});

	it("stays within the reviewed budget", () => {
		const bytes = statSync(`${browserDirectory}${budget.file}`).size;
		const excess = bytes - budget.maxBytes;
		const report =
			`${budget.file} is ${bytes} bytes; budget ${budget.maxBytes} bytes; ` +
			`baseline ${budget.baselineBytes} bytes; ` +
			(excess > 0 ? `over budget by ${excess} bytes.` : `${-excess} bytes of headroom.`) +
			" Raise the budget in packages/browser/size-budget.json only in a deliberate, reviewed change.";
		expect(excess, report).toBeLessThanOrEqual(0);
	});

	it("keeps the budget consistent", () => {
		expect(Number.isSafeInteger(budget.baselineBytes)).toBe(true);
		expect(Number.isSafeInteger(budget.maxBytes)).toBe(true);
		expect(budget.maxBytes).toBeGreaterThanOrEqual(budget.baselineBytes);
	});
});
