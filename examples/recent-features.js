import pdfcraft from "../dist/index.mjs"; // during development; use "pdfcraft" when installed
import { configureExample } from "./setup.js";

configureExample(pdfcraft);

const docDefinition = {
	pageMargins: (currentPage) => (currentPage % 2 === 0 ? [72, 40, 28, 40] : [28, 40, 72, 40]),
	content: [
		{ text: "Recent upstream features", style: "title" },
		{ text: "Table alignment", style: "heading" },
		...["left", "center", "right"].map((tableAlignment) => ({
			tableAlignment,
			margin: [0, 3],
			table: { widths: [110], body: { groups: [{ rows: [[`${tableAlignment}-aligned table`]] }] } },
		})),
		{ text: "Styled table-cell borders and fills", style: "heading" },
		{
			table: {
				borderRadius: 10,
				widths: [160, 160],
				body: {
					groups: [
						{
							rows: [
								[
									{ text: "Inherited style", style: "accentCell" },
									{ text: "Local override", style: "accentCell", fillColor: "#fef3c7" },
								],
							],
						},
					],
				},
			},
		},
		{ text: "Decorated stack blocks", style: "heading" },
		{
			stack: [
				{ text: "Payment information", bold: true, color: "#1e293b" },
				{ text: "IBAN: FR14 0099 8877 6655", margin: [0, 5, 0, 0] },
			],
			borderRadius: 12,
			borderWidth: 2,
			borderColor: "#334155",
			backgroundColor: "#f8fafc",
			padding: 12,
		},
		{ text: "Named SVG and inline image", style: "heading" },
		{
			text: [
				"An inline image ",
				{ image: "sample-photo", width: 34, height: 24 },
				" participates in wrapping.",
			],
		},
		{ svg: "status-mark", width: 120, margin: [0, 8] },
		{ text: "AcroForm fields", style: "heading" },
		{
			acroform: {
				type: "text",
				id: "example-name",
				options: { required: true, borderColor: "#2563eb", backgroundColor: "#eff6ff" },
			},
			width: "*",
			height: 22,
		},
		{
			text: [
				{ acroform: { type: "checkbox", id: "example-consent" }, width: 13, height: 13 },
				" I agree to the terms",
			],
			margin: [0, 8],
		},
		{ text: "Dynamic margins: wide left margin on this even page", pageBreak: "before" },
		{ text: "Dynamic margins: wide right margin on this odd page", pageBreak: "before" },
	],
	styles: {
		title: { fontSize: 22, bold: true, color: "#0f172a" },
		heading: { fontSize: 14, bold: true, color: "#1d4ed8", margin: [0, 16, 0, 6] },
		accentCell: {
			border: [true, true, true, true],
			borderColor: ["#2563eb", "#2563eb", "#2563eb", "#2563eb"],
			fillColor: "#dbeafe",
			fillOpacity: 0.8,
		},
	},
	images: { "sample-photo": "examples/images/sampleImage.jpg" },
	svgs: {
		"status-mark":
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 64"><rect width="120" height="64" rx="12" fill="#dbeafe"/><circle cx="32" cy="32" r="18" fill="#2563eb"/><path d="m23 32 6 6 12-14" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><text x="58" y="38" font-family="sans-serif" font-size="18" fill="#1e3a8a">Ready</text></svg>',
	},
};

const startedAt = performance.now();
const pdf = pdfcraft.createPdf(docDefinition);

pdf.write("pdfs/recent-features.pdf").then(
	() => console.log(`Generated in ${(performance.now() - startedAt).toFixed(1)} ms`),
	(error) => console.error(error),
);
