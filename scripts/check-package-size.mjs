import { readdir, stat, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const budgets = {
	bytes: 1_750_000,
	gzipBytes: 525_000,
	packageBytes: 2_250_000,
};

const browserBundle = new URL("../dist/browser.js", import.meta.url);
const [{ size }, contents] = await Promise.all([stat(browserBundle), readFile(browserBundle)]);
const gzipSize = gzipSync(contents).byteLength;

const sizeOfTree = async (url) => {
	const entries = await readdir(url, { withFileTypes: true });
	return entries.reduce(async (totalPromise, entry) => {
		const total = await totalPromise;
		const entryUrl = new URL(entry.name, url);
		return (
			total +
			(entry.isDirectory()
				? await sizeOfTree(new URL(`${entry.name}/`, url))
				: (await stat(entryUrl)).size)
		);
	}, Promise.resolve(0));
};

const packageRoot = new URL("../", import.meta.url);
const publishedRootFiles = await Promise.all(
	["package.json", "README.md", "CHANGELOG.md", "LICENSE"].map(async (file) =>
		stat(new URL(file, packageRoot)),
	),
);
const packageBytes =
	(await sizeOfTree(new URL("dist/", packageRoot))) +
	publishedRootFiles.reduce((total, file) => total + file.size, 0);

const format = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

console.log(`Browser bundle: ${format(size)} raw, ${format(gzipSize)} gzip`);
console.log(`Published package: ${format(packageBytes)} unpacked`);

const failures = [];
if (size > budgets.bytes) failures.push(`raw size exceeds ${format(budgets.bytes)}`);
if (gzipSize > budgets.gzipBytes) failures.push(`gzip size exceeds ${format(budgets.gzipBytes)}`);
if (packageBytes > budgets.packageBytes) {
	failures.push(`unpacked package size exceeds ${format(budgets.packageBytes)}`);
}

if (failures.length > 0) {
	throw new Error(`Package size budget failed: ${failures.join("; ")}`);
}
