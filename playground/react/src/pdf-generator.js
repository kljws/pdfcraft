import pdfcraft from "pdfcraft/browser";
import boldFont from "../../../fonts/Roboto/Roboto-Medium.ttf?url";
import boldItalicsFont from "../../../fonts/Roboto/Roboto-MediumItalic.ttf?url";
import italicsFont from "../../../fonts/Roboto/Roboto-Italic.ttf?url";
import normalFont from "../../../fonts/Roboto/Roboto-Regular.ttf?url";
import sampleImage from "../../../examples/images/sampleImage.jpg?url";
import testXml from "../../shared/samples/test.xml?raw";
import { parseDocumentDefinition, resolveDocumentResources } from "../../shared/editor";

const resolveAsset = (asset) => new URL(asset, window.location.href).href;

pdfcraft.addFonts({
	Roboto: {
		normal: resolveAsset(normalFont),
		bold: resolveAsset(boldFont),
		italics: resolveAsset(italicsFont),
		bolditalics: resolveAsset(boldItalicsFont),
	},
});

pdfcraft.addVirtualFileSystem({
	"./test.xml": { data: testXml, encoding: "utf8" },
});

pdfcraft.setUrlAccessPolicy((resource) => {
	const url = new URL(resource, window.location.href);
	return (
		url.origin === window.location.origin ||
		(url.protocol === "https:" && url.hostname === "raw.githubusercontent.com")
	);
});

const sampleImageUrl = resolveAsset(sampleImage);
const resourceUrls = new Map([["examples/images/sampleImage.jpg", sampleImageUrl]]);

export const generatePdf = (source) => {
	const documentDefinition = resolveDocumentResources(
		parseDocumentDefinition(source),
		resourceUrls,
	);
	if (source.includes("examples/images/sampleImage.jpg")) {
		documentDefinition.images = {
			...documentDefinition.images,
			[sampleImageUrl]: sampleImageUrl,
		};
	}
	return pdfcraft.createPdf(documentDefinition).getBlob();
};
