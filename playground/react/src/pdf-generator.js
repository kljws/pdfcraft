import pdfcraft from "pdfcraft/browser";
import { Roboto, Figtree } from "./fonts";
import sampleImage from "../../../examples/images/sampleImage.jpg?url";
import playgroundLogo from "../../logo.jpg?url";
import testXml from "../../shared/samples/test.xml?raw";
import { parseDocumentDefinition, resolveDocumentResources } from "../../shared/editor";

const resolveAsset = (asset) => new URL(asset, window.location.href).href;

pdfcraft.addFonts({
	Roboto: {
		normal: resolveAsset(Roboto.normal),
		bold: resolveAsset(Roboto.bold),
		italics: resolveAsset(Roboto.italics),
		bolditalics: resolveAsset(Roboto.bolditalics),
	},
});

pdfcraft.addFonts({
	Figtree: {
		normal: resolveAsset(Figtree.normal),
		bold: resolveAsset(Figtree.semiBold),
		italics: resolveAsset(Figtree.italics),
		bolditalics: resolveAsset(Figtree.bolditalics),
	},
	FigtreeSemiBold: {
		normal: resolveAsset(Figtree.semiBold),
		italics: resolveAsset(Figtree.semiBoldItalics),
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
const playgroundLogoUrl = resolveAsset(playgroundLogo);
const resourceUrls = new Map([
	["examples/images/sampleImage.jpg", sampleImageUrl],
	["playground/logo.jpg", playgroundLogoUrl],
]);

export const generatePdf = (source) => {
	const documentDefinition = resolveDocumentResources(
		parseDocumentDefinition(source),
		resourceUrls,
	);
	const referencedImageUrls = [...resourceUrls]
		.filter(([reference]) => source.includes(reference))
		.map(([, url]) => url);
	if (referencedImageUrls.length > 0) {
		documentDefinition.images = {
			...documentDefinition.images,
			...Object.fromEntries(referencedImageUrls.map((url) => [url, url])),
		};
	}
	return pdfcraft.createPdf(documentDefinition).getBlob();
};
