import pdfcraft from "../dist/index.mjs"; // during development; use "pdfcraft" when installed
import { configureExample } from "./setup.js";

configureExample(pdfcraft);

var docDefinition = {
	version: "1.5", // PDF version
	subset: "PDF/A-3a", // Subset types: // PDF/A-1, PDF/A-1a, PDF/A-1b, PDF/A-2, PDF/A-2a, PDF/A-2b, PDF/A-3, PDF/A-3a, PDF/A-3b, PDF/UA
	tagged: true, // Mark document as Tagged PDF
	displayTitle: true, // Display of document title in window title
	info: {
		title: "Awesome PDF document from PDFCraft",
	},
	content: ["PDF/A document for archive"],
};

var now = new Date();

var pdf = pdfcraft.createPdf(docDefinition);
pdf.write("pdfs/pdfa.pdf").then(
	() => {
		console.log(new Date() - now);
	},
	(err) => {
		console.error(err);
	},
);
