import pdfcraft from "pdfcraft/browser";
import type { OutputDocumentBrowser } from "pdfcraft/types";

const instance = pdfcraft.createPdfCraft();
const document: OutputDocumentBrowser = instance.createPdf({
	content: [
		{ text: "Browser consumer", bold: true },
		{
			table: {
				body: [
					{
						rows: [
							["Name", "Value"],
							["Browser", "Supported"],
						],
					},
				],
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
	],
});

document.getBuffer().then((buffer) => buffer.byteLength);
document.getBlob().then((blob) => blob.size);
document.download("browser.pdf");
document.open();
document.print();

// @ts-expect-error Node-only output method
document.write("browser.pdf");
