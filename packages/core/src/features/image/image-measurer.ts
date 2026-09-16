import type StyleContextStack from "../../services/styles/style-context-stack";
import type PDFDocument from "../../rendering/pdf-document";
import { measureBox } from "../../services/measurement/measure-box";
import type { Color } from "../../types";
import type { Dimensions, MeasuredPdfNode } from "../../types/internal";

class ImageMeasurer {
	private autoImageIndex = 1;
	private readonly inlineImageLabels = new Map<string | Uint8Array, string>();

	constructor(
		private readonly pdfDocument: PDFDocument,
		private readonly styleStack: StyleContextStack,
	) {}

	measureImageWithDimensions(node: MeasuredPdfNode, dimensions: Dimensions): MeasuredPdfNode {
		return measureBox(node, dimensions, this.styleStack);
	}

	convertIfInlineImage(node: MeasuredPdfNode): void {
		if (node.image instanceof Uint8Array) {
			const source = node.image;
			const label = this.getInlineImageLabel(source);
			this.pdfDocument.images[label] ??= source;
			node.image = label;
			return;
		}
		if (
			typeof node.image === "string" &&
			/^data:(image\/(jpeg|jpg|png)|application\/octet-stream);base64,/.test(node.image)
		) {
			const source = node.image;
			const label = this.getInlineImageLabel(source);
			this.pdfDocument.images[label] ??= source;
			node.image = label;
		}
	}

	private getInlineImageLabel(source: string | Uint8Array): string {
		let label = this.inlineImageLabels.get(source);
		if (!label) {
			label = `$$pdfcraft$$${this.autoImageIndex++}`;
			this.inlineImageLabels.set(source, label);
		}
		return label;
	}

	measureImage(node: MeasuredPdfNode): MeasuredPdfNode {
		this.convertIfInlineImage(node);
		if (typeof node.image !== "string") {
			throw new Error("Image node must reference a registered image resource");
		}

		const image = this.pdfDocument.provideImage(node.image);
		let imageSize = { width: image.width, height: image.height };
		if (image.orientation > 4) {
			imageSize = { width: image.height, height: image.width };
		}

		this.measureImageWithDimensions(node, imageSize);
		node._imageBorderColor = node.borderColor as unknown as Color | undefined;
		return node;
	}
}

export default ImageMeasurer;
