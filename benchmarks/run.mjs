import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createScenarios } from "./scenarios.mjs";

const argumentsMap = Object.fromEntries(
	process.argv.slice(2).map((argument) => {
		const [key, value] = argument.replace(/^--/, "").split("=", 2);
		return [key, value ?? true];
	}),
);
const profile = argumentsMap.quick ? "quick" : "standard";
const iterations = Number(argumentsMap.iterations ?? (profile === "quick" ? 1 : 3));
const warmup = Number(argumentsMap.warmup ?? (profile === "quick" ? 0 : 1));
const selectedScenarios =
	typeof argumentsMap.scenario === "string"
		? new Set(argumentsMap.scenario.split(",").filter(Boolean))
		: null;
if (!Number.isInteger(iterations) || iterations < 1) throw new Error("iterations must be >= 1");
if (!Number.isInteger(warmup) || warmup < 0) throw new Error("warmup must be >= 0");

const benchmarkDirectory = path.dirname(fileURLToPath(import.meta.url));
const worker = path.join(benchmarkDirectory, "worker.mjs");
const scenarios = createScenarios(profile).filter(
	({ name }) => selectedScenarios === null || selectedScenarios.has(name),
);
if (selectedScenarios !== null && scenarios.length !== selectedScenarios.size) {
	const resolvedNames = new Set(scenarios.map(({ name }) => name));
	const unknownNames = [...selectedScenarios].filter((name) => !resolvedNames.has(name));
	throw new Error(`Unknown benchmark scenario: ${unknownNames.join(", ")}`);
}

const percentile = (values, ratio) => {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
};
const median = (values) => percentile(values, 0.5);
const results = [];

for (const scenario of scenarios) {
	process.stderr.write(`Running ${scenario.name} (${iterations} measured iteration(s))...\n`);
	const raw = execFileSync(
		process.execPath,
		[
			"--expose-gc",
			worker,
			JSON.stringify({ profile, scenario: scenario.name, iterations, warmup }),
		],
		{ encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
	);
	const result = JSON.parse(raw);
	results.push({
		...result,
		summary: {
			medianDurationMs: median(result.samples.map(({ durationMs }) => durationMs)),
			p95DurationMs: percentile(
				result.samples.map(({ durationMs }) => durationMs),
				0.95,
			),
			medianPeakRssBytes: median(result.samples.map(({ peakRssBytes }) => peakRssBytes)),
			medianPeakHeapBytes: median(result.samples.map(({ peakHeapBytes }) => peakHeapBytes)),
			medianOutputBytes: median(result.samples.map(({ outputBytes }) => outputBytes)),
		},
	});
}

const megabytes = (bytes) => (bytes / 1024 / 1024).toFixed(1);
const rows = results.map(({ name, description, summary }) => ({
	scenario: name,
	workload: description,
	medianMs: summary.medianDurationMs.toFixed(1),
	p95Ms: summary.p95DurationMs.toFixed(1),
	peakRssMiB: megabytes(summary.medianPeakRssBytes),
	peakHeapMiB: megabytes(summary.medianPeakHeapBytes),
	outputMiB: megabytes(summary.medianOutputBytes),
}));

console.log(`PDFCraft benchmark (${profile}, Node ${process.version}, ${iterations} iteration(s))`);
console.table(rows);
