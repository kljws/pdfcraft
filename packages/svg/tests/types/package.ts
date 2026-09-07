import { svgExtension, type SvgToPdfOptions } from "@pdfcraft/svg";
import type { DocumentDefinition, PdfCraftExtension } from "@pdfcraft/core/types";

const extension: PdfCraftExtension = svgExtension;
const options: SvgToPdfOptions = {
	width: 20,
	height: 10,
	preserveAspectRatio: "xMidYMid meet",
	useCSS: false,
	fontCallback: (_family, _bold, _italic, fontOptions) =>
		fontOptions.fauxBold ? "Bold" : "Regular",
	imageCallback: (link) => link,
	documentCallback: () => '<svg width="20" height="10" />',
	colorCallback: (color) => color,
	warningCallback: () => undefined,
	assumePt: true,
	precision: 3,
};
const definition: DocumentDefinition = {
	content: { svg: '<svg width="20" height="10" />', options },
	svgs: { logo: "https://example.com/logo.svg" },
};

void extension;
void options;
void definition;
