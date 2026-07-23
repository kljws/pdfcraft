import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pdfcraft from "../../dist/index.mjs";
import { visualCases } from "./cases.mjs";

const visualDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(visualDirectory, "../..");
const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
const outputDirectory = path.resolve(
	packageRoot,
	outputArgument ? outputArgument.slice("--output=".length) : "pdfs/visual",
);
const fontDirectory = path.join(packageRoot, "fonts/Roboto");
const isWithinPackage = (filename) => {
	const resolved = path.resolve(filename);
	return resolved === packageRoot || resolved.startsWith(`${packageRoot}${path.sep}`);
};

const instance = pdfcraft.createPdfCraft({
	fonts: {
		Roboto: {
			normal: path.join(fontDirectory, "Roboto-Regular.ttf"),
			bold: path.join(fontDirectory, "Roboto-Medium.ttf"),
			italics: path.join(fontDirectory, "Roboto-Italic.ttf"),
			bolditalics: path.join(fontDirectory, "Roboto-MediumItalic.ttf"),
		},
	},
	localAccessPolicy: isWithinPackage,
	urlAccessPolicy: () => false,
});

await fs.mkdir(outputDirectory, { recursive: true });

for (const visualCase of visualCases) {
	const output = path.join(outputDirectory, visualCase.filename);
	await instance.createPdf(visualCase.definition).write(output);
	process.stdout.write(`${path.relative(packageRoot, output)}\n`);
}

process.stdout.write(`Generated ${visualCases.length} visual checks.\n`);
