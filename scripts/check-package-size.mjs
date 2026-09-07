import { readdir, stat, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const budgets = {
	browserBytes: 1_750_000,
	browserGzipBytes: 525_000,
	browserPackageBytes: 1_900_000,
	corePackageBytes: 1_500_000,
	qrPackageBytes: 250_000,
	svgPackageBytes: 400_000,
};

const browserPackage = new URL("../packages/browser/", import.meta.url);
const corePackage = new URL("../packages/core/", import.meta.url);
const qrPackage = new URL("../packages/qr/", import.meta.url);
const svgPackage = new URL("../packages/svg/", import.meta.url);
const browserBundle = new URL("dist/index.js", browserPackage);
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

const publishedSize = async (packageRoot) => {
	const rootFiles = await Promise.all(
		["package.json", "README.md", "LICENSE"].map(async (file) => stat(new URL(file, packageRoot))),
	);
	return (
		(await sizeOfTree(new URL("dist/", packageRoot))) +
		rootFiles.reduce((total, file) => total + file.size, 0)
	);
};

const [browserPackageBytes, corePackageBytes, qrPackageBytes, svgPackageBytes] = await Promise.all([
	publishedSize(browserPackage),
	publishedSize(corePackage),
	publishedSize(qrPackage),
	publishedSize(svgPackage),
]);

const format = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

console.log(`Browser bundle: ${format(size)} raw, ${format(gzipSize)} gzip`);
console.log(`@pdfcraft/browser package: ${format(browserPackageBytes)} unpacked`);
console.log(`@pdfcraft/core package: ${format(corePackageBytes)} unpacked`);
console.log(`@pdfcraft/qr package: ${format(qrPackageBytes)} unpacked`);
console.log(`@pdfcraft/svg package: ${format(svgPackageBytes)} unpacked`);

const failures = [];
if (size > budgets.browserBytes)
	failures.push(`browser raw size exceeds ${format(budgets.browserBytes)}`);
if (gzipSize > budgets.browserGzipBytes) {
	failures.push(`browser gzip size exceeds ${format(budgets.browserGzipBytes)}`);
}
if (browserPackageBytes > budgets.browserPackageBytes) {
	failures.push(`browser package exceeds ${format(budgets.browserPackageBytes)}`);
}
if (corePackageBytes > budgets.corePackageBytes) {
	failures.push(`core package exceeds ${format(budgets.corePackageBytes)}`);
}
if (qrPackageBytes > budgets.qrPackageBytes) {
	failures.push(`QR package exceeds ${format(budgets.qrPackageBytes)}`);
}
if (svgPackageBytes > budgets.svgPackageBytes) {
	failures.push(`SVG package exceeds ${format(budgets.svgPackageBytes)}`);
}

if (failures.length > 0) {
	throw new Error(`Package size budget failed: ${failures.join("; ")}`);
}
