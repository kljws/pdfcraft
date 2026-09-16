import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutAttachment, type AttachmentLayoutContext } from "./layout-attachment";
import { measureAttachment } from "./measure-attachment";
import { placeAttachment, type AttachmentWriter } from "./place-attachment";
import { renderAttachment, type AttachmentRenderContext } from "./render-attachment";

interface AttachmentFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: LayoutPdfNode;
	preprocessContext: undefined;
	measureContext: undefined;
	layoutContext: AttachmentLayoutContext;
	renderContext: AttachmentRenderContext;
}

interface AttachmentFeature extends NodeFeature<AttachmentFeatureStages> {
	measure(node: MeasuredPdfNode, context: undefined): MeasuredPdfNode;
	place(
		writer: AttachmentWriter,
		node: LayoutPdfNode,
		index?: number,
	): ReturnType<typeof placeAttachment>;
	layout(node: LayoutPdfNode, context: AttachmentLayoutContext): void;
	render(node: LayoutPdfNode, context: AttachmentRenderContext): void;
}

export const attachmentFeature: AttachmentFeature = {
	kind: "attachment",
	matches(node): boolean {
		return Boolean(node.attachment);
	},
	preprocess(node): PreprocessedPdfNode {
		return node;
	},
	measure: measureAttachment,
	layout: layoutAttachment,
	place: placeAttachment,
	render(node, context): void {
		renderAttachment(node, context);
	},
};
