import type { MeasuredPdfNode, PageItem, PdfNode } from "../../types/internal";
import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import type { LayoutImageNode, MeasuredImageNode, PreprocessedImageNode } from "./image.types";
import ImageMeasurer from "./image-measurer";
import { layoutImage } from "./layout-image";
import { placeImageItem } from "./place-image";
import { preprocessImage } from "./preprocess-image";
import { renderImage, type ImageRenderContext } from "./render-image";

interface ImageFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedImageNode;
	measureNode: MeasuredImageNode;
	measuredNode: MeasuredImageNode;
	layoutNode: LayoutImageNode;
	renderNode: LayoutImageNode;
	preprocessContext: undefined;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: ImageRenderContext;
	pageItem: Extract<PageItem, { type: "image" }>;
	inline: ImageInlineCapabilities;
}

export interface ImageInlineCapabilities {
	measure(node: MeasuredPdfNode, context: NodeMeasureContext): MeasuredPdfNode;
}

interface ImageFeature extends NodeFeature<ImageFeatureStages> {
	readonly kind: "image";
	readonly inline: ImageInlineCapabilities;
	preprocess(node: PdfNode): PreprocessedImageNode;
	measure(node: MeasuredImageNode, context: NodeMeasureContext): MeasuredImageNode;
	place(node: LayoutImageNode, context: NodePlaceContext): ReturnType<typeof placeImageItem>;
	layout(node: LayoutImageNode, context: NodeLayoutContext): void;
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
	measure(node: MeasuredImageNode, context: NodeMeasureContext): MeasuredImageNode {
		return getImageMeasurer(context).measureImage(node);
	},
	inline: {
		measure(node, context): MeasuredPdfNode {
			return getImageMeasurer(context).measureImage(node as MeasuredImageNode);
		},
	},
	layout(node, context): void {
		layoutImage(node, { writer: context.writer });
	},
	place(node: LayoutImageNode, context: NodePlaceContext): ReturnType<typeof placeImageItem> {
		return placeImageItem(node, context);
	},
	render(node: LayoutImageNode, context: ImageRenderContext): void {
		renderImage(node, context);
	},
};

function getImageMeasurer(context: NodeMeasureContext): ImageMeasurer {
	const existing = context.featureState.get("image.measurer");
	if (existing instanceof ImageMeasurer) return existing;
	const measurer = new ImageMeasurer(context.document, context.styles);
	context.featureState.set("image.measurer", measurer);
	return measurer;
}
