import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const sourceDirectory = path.resolve("src");
const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
const outputFile = path.resolve(outputArgument?.slice("--output=".length) || "SOURCE_CONTEXT.md");
const testDirectories = new Set(["__test__", "__tests__", "test", "tests"]);
const testFilePattern = /(?:^|\.)(?:test|spec)(?:\.|$)/;

const languageByExtension = {
	".css": "css",
	".cts": "typescript",
	".js": "javascript",
	".json": "json",
	".jsx": "jsx",
	".mjs": "javascript",
	".mts": "typescript",
	".svg": "svg",
	".ts": "typescript",
	".tsx": "tsx",
};

const collectSourceFiles = async (directory) => {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
		if (entry.isDirectory() && testDirectories.has(entry.name)) {
			continue;
		}

		const filename = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectSourceFiles(filename)));
		} else if (entry.isFile() && !testFilePattern.test(entry.name)) {
			files.push(filename);
		}
	}

	return files;
};

const getFence = (contents) => {
	const longestRun = Math.max(2, ...Array.from(contents.matchAll(/`+/g), ([run]) => run.length));
	return "`".repeat(longestRun + 1);
};

const files = await collectSourceFiles(sourceDirectory);
const sections = await Promise.all(
	files.map(async (filename) => {
		const contents = await readFile(filename, "utf8");
		const relativeFilename = path.relative(process.cwd(), filename).split(path.sep).join("/");
		const language = languageByExtension[path.extname(filename)] ?? "text";
		const fence = getFence(contents);
		return `## \`${relativeFilename}\`\n\n${fence}${language}\n${contents.trimEnd()}\n${fence}`;
	}),
);

const document = [
	"# PDFCraft source context",
	"",
	"Generated production sources from `src/`. Test directories and test/spec files are excluded.",
	"",
	...sections.flatMap((section) => [section, ""]),
].join("\n");

await writeFile(outputFile, document, "utf8");
process.stdout.write(
	`Generated ${path.relative(process.cwd(), outputFile)} with ${files.length} source files.\n`,
);
