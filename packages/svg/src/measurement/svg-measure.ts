import { XmlDocument } from "xmldoc";
import type { SvgDimensions } from "../types";

const stripUnits = (textVal: string | null | undefined): number | undefined => {
	if (textVal == null) {
		return undefined;
	}
	const n = parseFloat(textVal);
	if (typeof n !== "number" || isNaN(n)) {
		return undefined;
	}
	return n;
};

const parseSVG = (svgString: string): XmlDocument => {
	let doc;

	try {
		doc = new XmlDocument(svgString);
	} catch (error) {
		throw new Error("Invalid svg document (" + error + ")", { cause: error });
	}

	if (doc.name !== "svg") {
		throw new Error("Invalid svg document (expected <svg>)");
	}

	return doc;
};

export class SVGMeasure {
	measureSVG(svg: unknown): SvgDimensions {
		let width: string | null | undefined;
		let height: string | null | undefined;
		let viewBox: string | null | undefined;

		if (typeof svg === "string") {
			const doc = parseSVG(svg);

			width = doc.attr.width;
			height = doc.attr.height;
			viewBox = doc.attr.viewBox;
		} else if (
			typeof SVGElement !== "undefined" &&
			svg instanceof SVGElement &&
			typeof getComputedStyle === "function"
		) {
			width = svg.getAttribute("width");
			height = svg.getAttribute("height");
			viewBox = svg.getAttribute("viewBox");
		} else {
			throw new Error("Invalid SVG document");
		}

		let docWidth = stripUnits(width);
		let docHeight = stripUnits(height);

		if ((docWidth === undefined || docHeight === undefined) && typeof viewBox === "string") {
			const viewBoxParts = viewBox.split(/[,\s]+/);
			if (viewBoxParts.length !== 4) {
				throw new Error(
					"Unexpected svg viewBox format, should have 4 entries but found: '" + viewBox + "'",
				);
			}
			if (docWidth === undefined) {
				docWidth = stripUnits(viewBoxParts[2]);
			}
			if (docHeight === undefined) {
				docHeight = stripUnits(viewBoxParts[3]);
			}
		}

		return {
			width: docWidth,
			height: docHeight,
		};
	}

	writeDimensions(svg: unknown, dimensions: { width: number; height: number }): unknown {
		if (typeof svg === "string") {
			const doc = parseSVG(svg);

			if (typeof doc.attr.viewBox !== "string") {
				doc.attr.viewBox = `0 0 ${stripUnits(doc.attr.width)} ${stripUnits(doc.attr.height)}`;
			}

			doc.attr.width = "" + dimensions.width;
			doc.attr.height = "" + dimensions.height;

			return doc.toString();
		}

		if (!(typeof SVGElement !== "undefined" && svg instanceof SVGElement)) {
			throw new Error("Invalid SVG document");
		}

		if (!svg.hasAttribute("viewBox")) {
			svg.setAttribute(
				"viewBox",
				`0 0 ${stripUnits(svg.getAttribute("width"))} ${stripUnits(svg.getAttribute("height"))}`,
			);
		}

		svg.setAttribute("width", "" + dimensions.width);
		svg.setAttribute("height", "" + dimensions.height);

		return svg;
	}
}
