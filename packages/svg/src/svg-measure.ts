import { XmlDocument } from "xmldoc";
import SVGtoPDF from "./vendor/svg-to-pdfkit.cjs";
import type {
	ContentBase,
	Dictionary,
	ExtensionMeasureContext,
	PdfCraftExtension,
	ResourceSource,
} from "@pdfcraft/core/types";

export interface SvgDimensions {
	width?: number;
	height?: number;
}

export interface SvgElement {
	getAttribute(name: string): string | null;
	hasAttribute(name: string): boolean;
	setAttribute(name: string, value: string): void;
}

export type SvgToPdfColor = [[number, number, number], number];

export interface SvgToPdfFontOptions {
	fauxItalic: boolean;
	fauxBold: boolean;
}

export interface SvgToPdfOptions {
	width?: number;
	height?: number;
	preserveAspectRatio?: string;
	useCSS?: boolean;
	fontCallback?: (
		family: string,
		bold: boolean,
		italic: boolean,
		fontOptions: SvgToPdfFontOptions,
	) => string;
	imageCallback?: (link: string) => string;
	documentCallback?: (file: string) => SvgElement | string | Array<SvgElement | string>;
	colorCallback?: (color: SvgToPdfColor) => SvgToPdfColor;
	warningCallback?: (warning: string) => void;
	assumePt?: boolean;
	precision?: number;
}

export interface SvgNode extends ContentBase {
	svg: string | SvgElement;
	width?: number;
	height?: number;
	fit?: [number, number];
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	maxHeight?: number;
	options?: SvgToPdfOptions;
}

declare global {
	interface PdfCraftContentExtensionRegistry {
		svg: SvgNode;
	}

	interface PdfCraftDocumentExtensionRegistry {
		svgs?: Dictionary<ResourceSource>;
	}
}

/**
 * Strip unit postfix, parse number, but return undefined instead of NaN for bad input
 *
 * @param textVal
 * @returns
 */
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

/**
 * Make sure it's valid XML and the root tag is <svg/>, returns xmldoc DOM
 *
 * @param svgString
 * @returns
 */
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

const svgMeasure = new SVGMeasure();

const decodeBytes = (value: Uint8Array): string => new TextDecoder().decode(value);

const resolveSource = (source: unknown, context: ExtensionMeasureContext): unknown => {
	if (typeof source !== "string") return source;
	const resources = context.documentDefinition.svgs;
	let resolved =
		resources && typeof resources === "object"
			? ((resources as Record<string, unknown>)[source] ?? source)
			: source;
	if (typeof resolved === "string" && context.virtualFileSystem?.existsSync(resolved)) {
		resolved = context.virtualFileSystem.readFileSync(resolved);
	}
	if (resolved instanceof ArrayBuffer) resolved = new Uint8Array(resolved);
	if (resolved instanceof Uint8Array) return decodeBytes(resolved);
	if (typeof resolved !== "string") throw new Error("Invalid SVG resource");

	const dataUrl = resolved.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?(;base64)?,(.*)$/is);
	if (!dataUrl) return resolved;
	return dataUrl[1]
		? decodeBytes(Uint8Array.from(atob(dataUrl[2]), (character) => character.charCodeAt(0)))
		: decodeURIComponent(dataUrl[2]);
};

export const svgExtension: PdfCraftExtension = {
	name: "svg",
	pageBreakKeys: ["svg"],
	test: (node) =>
		typeof node.svg === "string" ||
		(typeof SVGElement !== "undefined" && node.svg instanceof SVGElement),
	resolveResources: (documentDefinition, resolve) => {
		const resources = documentDefinition.svgs;
		if (resources === undefined) return;
		if (!resources || typeof resources !== "object" || Array.isArray(resources)) {
			throw new Error("Invalid SVG resource dictionary");
		}
		for (const [name, resource] of Object.entries(resources)) {
			if (
				typeof resource !== "string" &&
				(!resource || typeof resource !== "object" || typeof resource.url !== "string")
			) {
				throw new Error(`SVG '${name}' contains an invalid resource`);
			}
			(resources as Record<string, unknown>)[name] = resolve(resource);
		}
	},
	measure: (node, context) => {
		const source = resolveSource(node.svg, context);
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
	render: ({ document, node, resolveFont }) => {
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
	},
};
