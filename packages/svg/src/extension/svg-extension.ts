import { SVGMeasure } from "../measurement/svg-measure";
import { renderSvg } from "../renderer/render-svg";
import { resolveSvgResources, resolveSvgSource } from "../resources/svg-resources";
import type { PdfCraftExtension } from "@pdfcraft/core/types";

const svgMeasure = new SVGMeasure();

export const svgExtension: PdfCraftExtension = {
	name: "svg",
	pageBreakKeys: ["svg"],
	test: (node) =>
		typeof node.svg === "string" ||
		(typeof SVGElement !== "undefined" && node.svg instanceof SVGElement),
	resolveResources: resolveSvgResources,
	measure: (node, context) => {
		const source = resolveSvgSource(node.svg, context);
		const dimensions = svgMeasure.measureSVG(source);
		if (typeof dimensions.width !== "number" && typeof dimensions.height !== "number") {
			throw new Error("SVG is missing defined width and height.");
		}
		if (typeof dimensions.width !== "number") throw new Error("SVG is missing defined width.");
		if (typeof dimensions.height !== "number") throw new Error("SVG is missing defined height.");

		node.svg = source;
		context.measureBox({ width: dimensions.width, height: dimensions.height });
		const font = context.getStyle("font");
		node.font = typeof font === "string" ? font : undefined;
		if (typeof node._width !== "number" || typeof node._height !== "number") {
			throw new Error("SVG layout dimensions are missing.");
		}
		node.svg = svgMeasure.writeDimensions(source, {
			width: node._width,
			height: node._height,
		});
	},
	render: renderSvg,
};
