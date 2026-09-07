import { readdir, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { Rolldown } from "tsdown";

const packageRoot = new URL("../", import.meta.url);
const coreRequire = createRequire(new URL("../packages/core/package.json", import.meta.url));
const browserRequire = createRequire(new URL("../packages/browser/package.json", import.meta.url));
const dependencyNames = ["pdfkit", "fontkit"];
const pdfkitRequire = createRequire(coreRequire.resolve("pdfkit"));
const dependencyDirectories = {
	pdfkit: dirname(dirname(coreRequire.resolve("pdfkit"))),
	fontkit: dirname(dirname(pdfkitRequire.resolve("fontkit"))),
};
const pdfkitStandalone = join(dirname(browserRequire.resolve("pdfkit")), "pdfkit.standalone.js");

const sizeOfTree = async (directory) => {
	let bytes = 0;
	let files = 0;

	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			const child = await sizeOfTree(path);
			bytes += child.bytes;
			files += child.files;
		} else if (entry.isFile()) {
			bytes += (await stat(path)).size;
			files += 1;
		}
	}

	return { bytes, files };
};

const measureCode = (code) => {
	const buffer = Buffer.from(code);
	return {
		raw: buffer.byteLength,
		gzip: gzipSync(buffer, { level: 9 }).byteLength,
		brotli: brotliCompressSync(buffer).byteLength,
	};
};

const bundle = async ({ input, alias = {}, external = [] }) => {
	const build = await Rolldown.rolldown({
		input,
		platform: "browser",
		transform: { target: "es2020" },
		resolve: { alias },
		external,
	});
	const generated = await build.generate({ format: "esm", minify: true });
	await build.close();
	const code = generated.output
		.filter((output) => output.type === "chunk")
		.map((output) => output.code)
		.join("");
	return measureCode(code);
};

const subtract = (full, reduced) => ({
	raw: full.raw - reduced.raw,
	gzip: full.gzip - reduced.gzip,
	brotli: full.brotli - reduced.brotli,
});

const formatBytes = (bytes) =>
	`${bytes.toLocaleString("en-US")} B (${(bytes / 1024).toFixed(1)} KiB)`;
const formatShare = (bytes, total) => `${((bytes / total) * 100).toFixed(1)}%`;

const installed = [];
for (const dependency of dependencyNames) {
	const directory = dependencyDirectories[dependency];
	const packageJson = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
	const size = await sizeOfTree(directory);
	installed.push({
		dependency: `${dependency}@${packageJson.version}`,
		files: size.files,
		bytes: size.bytes,
		size: formatBytes(size.bytes),
	});
}

const browserInput = fileURLToPath(new URL("packages/browser/src/index.ts", packageRoot));
const qrInput = fileURLToPath(new URL("packages/qr/src/index.ts", packageRoot));
const svgInput = fileURLToPath(new URL("packages/svg/src/index.ts", packageRoot));
const browserAlias = { pdfkit: pdfkitStandalone };
const [full, withoutPdfkit, qrBundle, svgBundle] = await Promise.all([
	bundle({ input: browserInput, alias: browserAlias }),
	bundle({ input: browserInput, alias: browserAlias, external: ["pdfkit"] }),
	bundle({ input: qrInput }),
	bundle({ input: svgInput }),
]);

const pdfkitContribution = subtract(full, withoutPdfkit);
const projectContribution = withoutPdfkit;

const fontkitInput = join(dirname(pdfkitRequire.resolve("fontkit")), "browser-module.mjs");
const fontkitReference = await bundle({ input: fontkitInput });

console.log("\nInstalled package directories (dependencies are not double-counted):");
console.table(installed);

console.log("Browser bundle (minified, ES2020):");
console.table([
	{
		component: "full @pdfcraft/browser",
		raw: formatBytes(full.raw),
		gzip: formatBytes(full.gzip),
		brotli: formatBytes(full.brotli),
	},
	{
		component: "pdfkit marginal contribution",
		raw: `${formatBytes(pdfkitContribution.raw)} (${formatShare(pdfkitContribution.raw, full.raw)})`,
		gzip: `${formatBytes(pdfkitContribution.gzip)} (${formatShare(pdfkitContribution.gzip, full.gzip)})`,
		brotli: `${formatBytes(pdfkitContribution.brotli)} (${formatShare(pdfkitContribution.brotli, full.brotli)})`,
	},
	{
		component: "@pdfcraft/browser without PDFKit",
		raw: `${formatBytes(projectContribution.raw)} (${formatShare(projectContribution.raw, full.raw)})`,
		gzip: `${formatBytes(projectContribution.gzip)} (${formatShare(projectContribution.gzip, full.gzip)})`,
		brotli: `${formatBytes(projectContribution.brotli)} (${formatShare(projectContribution.brotli, full.brotli)})`,
	},
	{
		component: "optional @pdfcraft/qr",
		raw: formatBytes(qrBundle.raw),
		gzip: formatBytes(qrBundle.gzip),
		brotli: formatBytes(qrBundle.brotli),
	},
	{
		component: "optional @pdfcraft/svg",
		raw: formatBytes(svgBundle.raw),
		gzip: formatBytes(svgBundle.gzip),
		brotli: formatBytes(svgBundle.brotli),
	},
]);

console.log("Fontkit reference bundle (browser entry plus its transitive dependencies):");
console.table([
	{
		component: "fontkit reference",
		raw: formatBytes(fontkitReference.raw),
		gzip: formatBytes(fontkitReference.gzip),
		brotli: formatBytes(fontkitReference.brotli),
	},
]);

console.log(
	"Note: the production browser build aliases PDFKit to pdfkit.standalone.js, where Fontkit is already flattened into PDFKit. Its exact marginal bytes cannot be separated from that artifact; the reference row measures Fontkit independently instead.",
);
console.log(
	"Node builds keep npm production dependencies external. Vendored QR and SVG implementations are included in their optional package bundles.",
);
