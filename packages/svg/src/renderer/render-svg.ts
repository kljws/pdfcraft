import svgToPdf from "../vendor/svg-to-pdfkit";
import type { ExtensionRenderContext } from "@pdfcraft/core/types";
import type { SvgToPdfOptions } from "../types";

export const renderSvg = ({ document, node, resolveFont }: ExtensionRenderContext): void => {
	const options = {
		width: node._width,
		height: node._height,
		assumePt: true,
		useCSS: typeof node.svg !== "string",
		...(node.options && typeof node.options === "object" ? node.options : {}),
		fontCallback: (family: string, bold: boolean, italic: boolean) =>
			resolveFont(family, bold, italic, typeof node.font === "string" ? node.font : "Roboto"),
	};
	svgToPdf(document, node.svg, node.x as number, node.y as number, options as SvgToPdfOptions);
};
