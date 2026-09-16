import type StyleContextStack from "../../services/styles/style-context-stack";
import type PDFDocument from "../../rendering/pdf-document";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import ImageMeasurer from "./image-measurer";
import { layoutImage, type ImageLayoutContext } from "./layout-image";
import { placeImage, type ImageWriter } from "./place-image";
import { preprocessImage } from "./preprocess-image";
import { renderImage, type ImageRenderContext } from "./render-image";

interface ImageFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: LayoutPdfNode;
	preprocessContext: undefined;
	measureContext: ImageMeasurer;
	layoutContext: ImageLayoutContext;
	renderContext: ImageRenderContext;
}

interface ImageFeature extends NodeFeature<ImageFeatureStages> {
	createMeasurer(document: PDFDocument, styles: StyleContextStack): ImageMeasurer;
	measure(node: MeasuredPdfNode, context: ImageMeasurer): MeasuredPdfNode;
	place(writer: ImageWriter, node: LayoutPdfNode, index?: number): ReturnType<typeof placeImage>;
	layout(node: LayoutPdfNode, context: ImageLayoutContext): void;
	render(node: LayoutPdfNode, context: ImageRenderContext): void;
}

export const imageFeature: ImageFeature = {
	kind: "image",
	matches(node: PreprocessedPdfNode): boolean {
		return Boolean(node.image);
	},
	preprocess(node): PreprocessedPdfNode {
		return preprocessImage(node);
	},
	createMeasurer(document: PDFDocument, styles: StyleContextStack): ImageMeasurer {
		return new ImageMeasurer(document, styles);
	},
	measure(node: MeasuredPdfNode, measurer: ImageMeasurer): MeasuredPdfNode {
		return measurer.measureImage(node);
	},
	layout(node: LayoutPdfNode, context: ImageLayoutContext): void {
		layoutImage(node, context);
	},
	place(writer: ImageWriter, node: LayoutPdfNode, index?: number): ReturnType<typeof placeImage> {
		return placeImage(writer, node, index);
	},
	render(node: LayoutPdfNode, context: ImageRenderContext): void {
		renderImage(node, context);
	},
};
