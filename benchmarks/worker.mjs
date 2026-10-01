import { performance } from "node:perf_hooks";
import { createScenarios } from "./scenarios.mjs";

const options = JSON.parse(process.argv[2]);
const scenario = createScenarios(options.profile).find(({ name }) => name === options.scenario);
if (!scenario) throw new Error(`Unknown benchmark scenario: ${options.scenario}`);

const memory = () => {
	const { heapUsed, external } = process.memoryUsage();
	return { heapUsed, external };
};

const measure = async () => {
	globalThis.gc?.();
	const before = memory();
	let peak = before;
	const sampler = setInterval(() => {
		const current = memory();
		peak = {
			heapUsed: Math.max(peak.heapUsed, current.heapUsed),
			external: Math.max(peak.external, current.external),
		};
	}, 5);
	const startedAt = performance.now();
	try {
		const outputBytes = await scenario.run();
		const durationMs = performance.now() - startedAt;
		const after = memory();
		peak = {
			heapUsed: Math.max(peak.heapUsed, after.heapUsed),
			external: Math.max(peak.external, after.external),
		};
		return {
			durationMs,
			outputBytes,
			peakHeapBytes: Math.max(0, peak.heapUsed - before.heapUsed),
			peakExternalBytes: Math.max(0, peak.external - before.external),
		};
	} finally {
		clearInterval(sampler);
	}
};

for (let index = 0; index < options.warmup; index++) await scenario.run();

const samples = [];
for (let index = 0; index < options.iterations; index++) samples.push(await measure());

process.stdout.write(
	JSON.stringify({ name: scenario.name, description: scenario.description, samples }),
);
