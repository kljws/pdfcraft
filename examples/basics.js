import pdfcraft from "../dist/index.mjs"; // during development; use "pdfcraft" when installed
import { configureExample } from "./setup.js";

configureExample(pdfcraft);

// or you can define the font manually:
/*
pdfcraft.addFonts({
	Roboto: {
		normal: 'fonts/Roboto/Roboto-Regular.ttf',
		bold: 'fonts/Roboto/Roboto-Medium.ttf',
		italics: 'fonts/Roboto/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto/Roboto-MediumItalic.ttf'
	}
});
*/

var docDefinition = {
	content: [
		"First paragraph",
		"Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines",
	],
};

var now = new Date();

var pdf = pdfcraft.createPdf(docDefinition);
pdf.write("pdfs/basics.pdf").then(
	() => {
		console.log(new Date() - now);
	},
	(err) => {
		console.error(err);
	},
);
