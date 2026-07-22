import type StyleContextStack from "../layout/style-context-stack";
import type PDFDocument from "../rendering/pdf-document";
import type SVGMeasure from "./svg-measure";
import type { Alignment } from "../types";
import type { Dimensions, MeasuredPdfNode } from "../types/internal";
import { isNumber } from "../utils/variable-type";

class DocMeasureMedia {
	private autoImageIndex = 1;

	constructor(
		private readonly pdfDocument: PDFDocument,
		private readonly styleStack: StyleContextStack,
		private readonly svgMeasure: SVGMeasure,
	) {}

	measureImageWithDimensions(node: MeasuredPdfNode, dimensions: Dimensions): MeasuredPdfNode {
		if (Array.isArray(node.fit)) {
			let factor =
				dimensions.width / dimensions.height > node.fit[0] / node.fit[1]
					? node.fit[0] / dimensions.width
					: node.fit[1] / dimensions.height;
			node._width = node._minWidth = node._maxWidth = dimensions.width * factor;
			node._height = dimensions.height * factor;
		} else if (node.cover) {
			node._width = node._minWidth = node._maxWidth = node.cover.width;
			node._height = node._minHeight = node._maxHeight = node.cover.height;
		} else {
			let nodeWidth = isNumber(node.width) ? node.width : undefined;
			let nodeHeight = isNumber(node.height) ? node.height : undefined;
			let ratio = dimensions.width / dimensions.height;

			node._width =
				node._minWidth =
				node._maxWidth =
					nodeWidth || (nodeHeight ? nodeHeight * ratio : dimensions.width);
			node._height = nodeHeight || (nodeWidth ? nodeWidth / ratio : dimensions.height);

			if (isNumber(node.maxWidth) && node.maxWidth < node._width) {
				node._width = node._minWidth = node._maxWidth = node.maxWidth;
				node._height = (node._width * dimensions.height) / dimensions.width;
			}

			if (isNumber(node.maxHeight) && node.maxHeight < node._height) {
				node._height = node.maxHeight;
				node._width =
					node._minWidth =
					node._maxWidth =
						(node._height * dimensions.width) / dimensions.height;
			}

			if (isNumber(node.minWidth) && node.minWidth > node._width) {
				node._width = node._minWidth = node._maxWidth = node.minWidth;
				node._height = (node._width * dimensions.height) / dimensions.width;
			}

			if (isNumber(node.minHeight) && node.minHeight > node._height) {
				node._height = node.minHeight;
				node._width =
					node._minWidth =
					node._maxWidth =
						(node._height * dimensions.width) / dimensions.height;
			}
		}

		node._alignment = this.styleStack.getProperty("alignment") as Alignment | undefined;
		return node;
	}

	convertIfInlineImage(node: MeasuredPdfNode): void {
		if (node.image instanceof Uint8Array) {
			const label = `$$pdfcraft$$${this.autoImageIndex++}`;
			this.pdfDocument.images[label] = node.image;
			node.image = label;
			return;
		}
		if (
			typeof node.image === "string" &&
			/^data:(image\/(jpeg|jpg|png)|application\/octet-stream);base64,/.test(node.image)
		) {
			// base64 data URL (image/* or application/octet-stream)
			let label = `$$pdfcraft$$${this.autoImageIndex++}`;
			this.pdfDocument.images[label] = node.image;
			node.image = label;
		}
	}

	measureImage(node: MeasuredPdfNode): MeasuredPdfNode {
		this.convertIfInlineImage(node);
		if (typeof node.image !== "string") {
			throw new Error("Image node must reference a registered image resource");
		}

		let image = this.pdfDocument.provideImage(node.image);

		let imageSize = { width: image.width, height: image.height };

		// If EXIF orientation calls for it, swap width and height
		if (image.orientation > 4) {
			imageSize = { width: image.height, height: image.width };
		}

		this.measureImageWithDimensions(node, imageSize);

		return node;
	}

	measureSVG(node: MeasuredPdfNode): MeasuredPdfNode {
		let dimensions = this.svgMeasure.measureSVG(node.svg!);

		if (!isNumber(dimensions.width) && !isNumber(dimensions.height)) {
			throw new Error("SVG is missing defined width and height.");
		} else if (!isNumber(dimensions.width)) {
			throw new Error("SVG is missing defined width.");
		} else if (!isNumber(dimensions.height)) {
			throw new Error("SVG is missing defined height.");
		}

		this.measureImageWithDimensions(node, {
			width: dimensions.width,
			height: dimensions.height,
		});

		const font = this.styleStack.getProperty("font");
		node.font = typeof font === "string" ? font : undefined;

		// SVG requires a defined width and height
		if (!isNumber(node._width) && !isNumber(node._height)) {
			throw new Error("SVG is missing defined width and height.");
		} else if (!isNumber(node._width)) {
			throw new Error("SVG is missing defined width.");
		} else if (!isNumber(node._height)) {
			throw new Error("SVG is missing defined height.");
		}

		// scale SVG based on final dimension
		node.svg = this.svgMeasure.writeDimensions(node.svg!, {
			width: node._width,
			height: node._height,
		});

		return node;
	}
}

export default DocMeasureMedia;
