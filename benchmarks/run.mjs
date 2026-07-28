import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import os from "node:os";
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
const selectedScenario = typeof argumentsMap.scenario === "string" ? argumentsMap.scenario : null;
const outputPath = typeof argumentsMap.output === "string" ? argumentsMap.output : null;

if (!Number.isInteger(iterations) || iterations < 1) throw new Error("iterations must be >= 1");
if (!Number.isInteger(warmup) || warmup < 0) throw new Error("warmup must be >= 0");

const benchmarkDirectory = path.dirname(fileURLToPath(import.meta.url));
const worker = path.join(benchmarkDirectory, "worker.mjs");
const scenarios = createScenarios(profile).filter(
	({ name }) => selectedScenario === null || name === selectedScenario,
);
if (scenarios.length === 0) throw new Error(`Unknown benchmark scenario: ${selectedScenario}`);

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

const report = {
	schemaVersion: 1,
	createdAt: new Date().toISOString(),
	profile,
	iterations,
	warmup,
	runtime: {
		node: process.version,
		platform: process.platform,
		architecture: process.arch,
		cpus: os.cpus().length,
		cpuModel: os.cpus()[0]?.model ?? "unknown",
		totalMemoryBytes: os.totalmem(),
	},
	results,
};

if (outputPath) {
	await writeFile(path.resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`);
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
if (outputPath) console.log(`JSON report: ${path.resolve(outputPath)}`);

const markdownPath = path.join(benchmarkDirectory, "benchmark-report.md");
const markdownRows = rows
	.map(
		(row) =>
			`| ${row.scenario} | ${row.workload} | ${row.medianMs} | ${row.p95Ms} | ${row.peakRssMiB} | ${row.peakHeapMiB} | ${row.outputMiB} |`,
	)
	.join("\n");
const markdown = `# PDFCraft benchmark report

- Profile: \`${profile}\`
- Node: \`${process.version}\`
- Iterations: ${iterations}
- Warmup: ${warmup}
- Created: ${report.createdAt}
- Runtime: ${report.runtime.cpuModel} · ${report.runtime.cpus} CPUs · ${report.runtime.platform}/${report.runtime.architecture}

| Scenario | Workload | Median ms | P95 ms | RSS MiB | Heap MiB | Output MiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${markdownRows}
`;

await writeFile(markdownPath, markdown);
console.log(`Markdown report: ${markdownPath}`);
