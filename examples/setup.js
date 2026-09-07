import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { qrExtension } from "../packages/qr/dist/index.js";
import { svgExtension } from "../packages/svg/dist/index.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const fontDirectory = path.resolve(directory, "../fonts/Roboto");
const projectDirectory = path.resolve(directory, "..");
const isWithin = (root, filename) => filename === root || filename.startsWith(`${root}${path.sep}`);

const fonts = {
	Roboto: {
		normal: path.join(fontDirectory, "Roboto-Regular.ttf"),
		bold: path.join(fontDirectory, "Roboto-Medium.ttf"),
		italics: path.join(fontDirectory, "Roboto-Italic.ttf"),
		bolditalics: path.join(fontDirectory, "Roboto-MediumItalic.ttf"),
	},
};

export const configureExample = (pdfcraft) => {
	pdfcraft.addExtensions(qrExtension, svgExtension);
	pdfcraft.addFonts(fonts);
	pdfcraft.setLocalAccessPolicy((filename) => isWithin(projectDirectory, path.resolve(filename)));
	pdfcraft.setUrlAccessPolicy(() => false);
	fs.mkdirSync(path.resolve(process.cwd(), "private/pdfs"), { recursive: true });
};
