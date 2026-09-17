import type StyleContextStack from "../../services/styles/style-context-stack";
import type PDFDocument from "../../rendering/pdf-document";
import type { PdfNode } from "../../types/internal";
import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { LayoutImageNode, MeasuredImageNode, PreprocessedImageNode } from "./image.types";
import ImageMeasurer from "./image-measurer";
import { layoutImage, type ImageLayoutContext } from "./layout-image";
import { placeImage, type ImageWriter } from "./place-image";
import { preprocessImage } from "./preprocess-image";
import { renderImage, type ImageRenderContext } from "./render-image";

interface ImageFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedImageNode;
	measuredNode: MeasuredImageNode;
	layoutNode: LayoutImageNode;
	renderNode: LayoutImageNode;
	preprocessContext: undefined;
	measureContext: ImageMeasurer;
	layoutContext: ImageLayoutContext;
	renderContext: ImageRenderContext;
}

interface ImageFeature extends NodeFeature<ImageFeatureStages> {
	preprocess(node: PdfNode, context: undefined): PreprocessedImageNode;
	createMeasurer(document: PDFDocument, styles: StyleContextStack): ImageMeasurer;
	measure(node: MeasuredImageNode, context: ImageMeasurer): MeasuredImageNode;
	place(writer: ImageWriter, node: LayoutImageNode, index?: number): ReturnType<typeof placeImage>;
	layout(node: LayoutImageNode, context: ImageLayoutContext): void;
	render(node: LayoutImageNode, context: ImageRenderContext): void;
}

export const imageFeature: ImageFeature = {
	kind: "image",
	matches(node: PdfNode): boolean {
		return Boolean(node.image);
	},
	preprocess(node): PreprocessedImageNode {
		return preprocessImage(node);
	},
	createMeasurer(document: PDFDocument, styles: StyleContextStack): ImageMeasurer {
		return new ImageMeasurer(document, styles);
	},
	measure(node: MeasuredImageNode, measurer: ImageMeasurer): MeasuredImageNode {
		return measurer.measureImage(node);
	},
	layout(node: LayoutImageNode, context: ImageLayoutContext): void {
		layoutImage(node, context);
	},
	place(writer: ImageWriter, node: LayoutImageNode, index?: number): ReturnType<typeof placeImage> {
		return placeImage(writer, node, index);
	},
	render(node: LayoutImageNode, context: ImageRenderContext): void {
		renderImage(node, context);
	},
};
