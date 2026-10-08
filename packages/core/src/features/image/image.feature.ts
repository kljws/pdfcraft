import type { Inline, PageItem, PdfNode } from "../../types/internal";
import { markNodeKind } from "../../utils/node";
import { isObject } from "../../utils/variable-type";
import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import { layoutFeatureItem } from "../../layout/element-writer.helpers";
import type { LayoutImageNode, MeasuredImageNode, PreprocessedImageNode } from "./image.types";
import ImageMeasurer from "./image-measurer";
import { placeImageItem } from "./place-image";
import {
	renderImage,
	renderInlineImage,
	type ImageRenderContext,
	type InlineImageRenderContext,
} from "./render-image";

type ImageFeatureStages = NodeFeatureStages & {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedImageNode;
	measuredNode: MeasuredImageNode;
	layoutNode: LayoutImageNode;
	renderNode: LayoutImageNode;
	preprocessContext: undefined;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: ImageRenderContext;
	pageItem: Extract<PageItem, { type: "image" }>;
	inline: ImageInlineCapabilities;
};

/**
 * An image inside a text line: an atomic box sitting against the line top, styled like the
 * surrounding text. It is measured like a block image and drawn at its measured size, without the
 * block image's borders, cover, clipping or links.
 */
export type ImageInlineCapabilities = {
	readonly kind: "image";
	readonly verticalAlign: "top";
	readonly textStyled: true;
	readonly noWrap: false;
	matches(fragment: Record<string, unknown>): boolean;
	measure(inline: Inline, context: NodeMeasureContext): { width: number; height: number };
	render(inline: Inline, context: InlineImageRenderContext): void;
};

type ImageFeature = NodeFeature<ImageFeatureStages> & {
	readonly kind: "image";
	readonly inline: ImageInlineCapabilities;
	preprocess(node: PdfNode): PreprocessedImageNode;
	measure(node: MeasuredImageNode, context: NodeMeasureContext): MeasuredImageNode;
	place(node: LayoutImageNode, context: NodePlaceContext): ReturnType<typeof placeImageItem>;
	layout(node: LayoutImageNode, context: NodeLayoutContext): void;
	render(node: LayoutImageNode, context: ImageRenderContext): void;
};

export const imageFeature = {
	kind: "image",
	contentKeys: ["image"],
	matches(node: PdfNode): boolean {
		return Boolean(node.image);
	},
	preprocess(node): PreprocessedImageNode {
		const image = node.image;
		if (isObject(image) && image.type === "Buffer" && Array.isArray(image.data)) {
			node.image = Uint8Array.from(image.data);
		}
		return markNodeKind(node, "image");
	},
	measure(node: MeasuredImageNode, context: NodeMeasureContext): MeasuredImageNode {
		return getImageMeasurer(context).measureImage(node);
	},
	inline: {
		kind: "image",
		verticalAlign: "top",
		textStyled: true,
		noWrap: false,
		matches(fragment): boolean {
			return Boolean(fragment.image);
		},
		measure(inline, context): { width: number; height: number } {
			const measured = getImageMeasurer(context).measureImage(
				inline as unknown as MeasuredImageNode,
			);
			if (measured._kind !== "image") {
				throw new Error("Inline image measurement returned a non-image node");
			}
			return { width: measured._width ?? 0, height: measured._height ?? 0 };
		},
		render: renderInlineImage,
	},
	layout(node, context): void {
		layoutFeatureItem("image", node, context.writer);
	},
	place(node: LayoutImageNode, context: NodePlaceContext): ReturnType<typeof placeImageItem> {
		return placeImageItem(node, context);
	},
	render(node: LayoutImageNode, context: ImageRenderContext): void {
		renderImage(node, context);
	},
} satisfies ImageFeature;

function getImageMeasurer(context: NodeMeasureContext): ImageMeasurer {
	const existing = context.featureState.get("image.measurer");
	if (existing instanceof ImageMeasurer) return existing;
	const measurer = new ImageMeasurer(context.document, context.styles);
	context.featureState.set("image.measurer", measurer);
	return measurer;
}
