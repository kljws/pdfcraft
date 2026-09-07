import pdfcraft from "@pdfcraft/browser";
import { qrExtension } from "@pdfcraft/qr";
import { svgExtension } from "@pdfcraft/svg";
import type { DocumentDefinition, OutputDocumentBrowser } from "@pdfcraft/browser";

const instance = pdfcraft.createPdfCraft({ extensions: [qrExtension, svgExtension] });
const definition: DocumentDefinition = {
	content: [
		{ text: "Browser consumer", bold: true },
		{
			stack: ["Decorated browser block"],
			borderRadius: 8,
			borderWidth: 1,
			borderColor: "#334155",
			backgroundColor: "#f8fafc",
			padding: 8,
		},
		{
			table: {
				borderRadius: 6,
				body: {
					groups: [
						{
							rows: [
								["Name", "Value"],
								["Browser", "Supported"],
							],
						},
					],
				},
				widths: ["*", "auto"],
			},
		},
		{
			image: "photo",
			cover: { width: 120, height: 80 },
			borderRadius: 10,
			borderWidth: 1,
			borderColor: "black",
		},
		{ qr: "browser-typed", fit: 96 },
		{ svg: '<svg width="20" height="10" xmlns="http://www.w3.org/2000/svg" />' },
	],
};
const document: OutputDocumentBrowser = instance.createPdf(definition);

document.getBuffer().then((buffer) => buffer.byteLength);
document.getBlob().then((blob) => blob.size);
document.download("browser.pdf");
document.open();
document.print();

// @ts-expect-error Node-only output method
document.write("browser.pdf");
