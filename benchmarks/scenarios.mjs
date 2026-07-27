import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pdfcraft from "../dist/index.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const regularFont = path.join(packageRoot, "fonts/Roboto/Roboto-Regular.ttf");
const mediumFont = path.join(packageRoot, "fonts/Roboto/Roboto-Medium.ttf");
const sampleImage = path.join(packageRoot, "examples/images/sampleImage.jpg");

const createInstance = () =>
	pdfcraft.createPdfCraft({
		fonts: {
			Roboto: {
				normal: regularFont,
				bold: mediumFont,
				italics: regularFont,
				bolditalics: mediumFont,
			},
		},
		localAccessPolicy: (filename) => filename.startsWith(packageRoot),
		urlAccessPolicy: () => false,
	});

const pageDocument = (pageCount) => ({
	content: Array.from({ length: pageCount }, (_, index) => ({
		text: [
			{ text: `Benchmark page ${index + 1}\n`, bold: true, fontSize: 18 },
			"The quick brown fox jumps over the lazy dog. ".repeat(12),
		],
		pageBreak: index === 0 ? undefined : "before",
	})),
});

const tableDocument = (rowCount) => ({
	content: [
		{ text: `Large table benchmark: ${rowCount.toLocaleString("en-US")} rows`, fontSize: 18 },
		{
			table: {
				widths: [45, "*", 70, 70, 70, 70],
				header: {
					rows: [["#", "Description", "Quantity", "Unit price", "Tax", "Total"]],
					layout: "lightHorizontalLines",
				},
				body: {
					groups: Array.from({ length: rowCount }, (_, index) => ({
						rows: [
							[
								index + 1,
								`Line item ${index + 1}: ${"repeatable content ".repeat(2)}`,
								(index % 9) + 1,
								`${(10 + (index % 100) * 0.37).toFixed(2)} EUR`,
								`${index % 3 === 0 ? 20 : 10}%`,
								`${(25 + (index % 100) * 1.13).toFixed(2)} EUR`,
							],
						],
					})),
					layout: "lightHorizontalLines",
				},
			},
		},
	],
});

const complexSvg = (shapeCount) => {
	const shapes = Array.from({ length: shapeCount }, (_, index) => {
		const x = (index * 17) % 760;
		const y = (index * 29) % 360;
		const hue = index % 360;
		return `<rect x="${x}" y="${y}" width="36" height="24" rx="4" fill="hsl(${hue},70%,55%)" opacity="0.75"/>`;
	}).join("");
	return `<svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`;
};

const mediaDocument = async (imageCount, svgCount, svgShapeCount) => {
	const image = `data:image/jpeg;base64,${(await readFile(sampleImage)).toString("base64")}`;
	const svg = complexSvg(svgShapeCount);
	return {
		content: [
			{ text: "Media-heavy benchmark", fontSize: 18 },
			...Array.from({ length: Math.max(imageCount, svgCount) }, (_, index) => [
				...(index < imageCount
					? [{ image: "sample", fit: [500, 225], pageBreak: index === 0 ? undefined : "before" }]
					: []),
				...(index < svgCount ? [{ svg, fit: [500, 250] }] : []),
			]).flat(),
		],
		images: { sample: image },
	};
};

const render = async (definition) => {
	const buffer = await createInstance().createPdf(definition).getBuffer();
	return buffer.byteLength;
};

export function createScenarios(profile) {
	const quick = profile === "quick";
	const pageCounts = quick ? [100] : [100, 500, 1000];
	const tableRows = quick ? 250 : 2000;
	const imageCount = quick ? 4 : 40;
	const svgCount = quick ? 2 : 20;
	const svgShapes = quick ? 100 : 500;
	const concurrentDocuments = quick ? 2 : 8;
	const concurrentPages = quick ? 20 : 100;

	return [
		...pageCounts.map((pageCount) => ({
			name: `pages-${pageCount}`,
			description: `${pageCount.toLocaleString("en-US")} explicit pages`,
			run: () => render(pageDocument(pageCount)),
		})),
		{
			name: `table-${tableRows}-rows`,
			description: `${tableRows.toLocaleString("en-US")} rows × 6 columns`,
			run: () => render(tableDocument(tableRows)),
		},
		{
			name: "media-heavy",
			description: `${imageCount} JPEG placements + ${svgCount} SVGs × ${svgShapes} shapes`,
			run: async () => render(await mediaDocument(imageCount, svgCount, svgShapes)),
		},
		{
			name: "concurrent-generation",
			description: `${concurrentDocuments} concurrent documents × ${concurrentPages} pages`,
			run: async () => {
				const sizes = await Promise.all(
					Array.from({ length: concurrentDocuments }, () => render(pageDocument(concurrentPages))),
				);
				return sizes.reduce((total, size) => total + size, 0);
			},
		},
	];
}
