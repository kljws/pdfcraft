import pdfcraft from "../dist/index.mjs"; // during development; use "pdfcraft" when installed
import { configureExample } from "./setup.js";

configureExample(pdfcraft);

var docDefinition = {
	//userPassword: '123',
	ownerPassword: "123456",
	permissions: {
		printing: "highResolution", //'lowResolution'
		modifying: false,
		copying: false,
		annotating: true,
		fillingForms: true,
		contentAccessibility: true,
		documentAssembly: true,
	},
	content: ["Document content with security", "For details see to source or documentation."],
};

var now = new Date();

var pdf = pdfcraft.createPdf(docDefinition);
pdf.write("pdfs/security.pdf").then(
	() => {
		console.log(new Date() - now);
	},
	(err) => {
		console.error(err);
	},
);
