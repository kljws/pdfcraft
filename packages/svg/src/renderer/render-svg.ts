import SVGtoPDF from "../vendor/svg-to-pdfkit.cjs";
import type { ExtensionRenderContext } from "@pdfcraft/core/types";

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
	const render = SVGtoPDF as unknown as (
		document: object,
		source: unknown,
		x: number,
		y: number,
		options: Record<string, unknown>,
	) => void;
	render(document, node.svg, node.x as number, node.y as number, options);
};
