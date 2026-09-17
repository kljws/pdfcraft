import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutAttachment, type AttachmentLayoutContext } from "./layout-attachment";
import { measureAttachment } from "./measure-attachment";
import { placeAttachment, type AttachmentWriter } from "./place-attachment";
import { renderAttachment, type AttachmentRenderContext } from "./render-attachment";
import type {
	LayoutAttachmentNode,
	MeasuredAttachmentNode,
	PreprocessedAttachmentNode,
} from "./attachment.types";

interface AttachmentFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedAttachmentNode;
	measuredNode: MeasuredAttachmentNode;
	layoutNode: LayoutAttachmentNode;
	renderNode: LayoutAttachmentNode;
	preprocessContext: undefined;
	measureContext: undefined;
	layoutContext: AttachmentLayoutContext;
	renderContext: AttachmentRenderContext;
}

interface AttachmentFeature extends NodeFeature<AttachmentFeatureStages> {
	preprocess(node: PdfNode, context: undefined): PreprocessedAttachmentNode;
	measure(node: MeasuredAttachmentNode, context: undefined): MeasuredAttachmentNode;
	place(
		writer: AttachmentWriter,
		node: LayoutAttachmentNode,
		index?: number,
	): ReturnType<typeof placeAttachment>;
	layout(node: LayoutAttachmentNode, context: AttachmentLayoutContext): void;
	render(node: LayoutAttachmentNode, context: AttachmentRenderContext): void;
}

export const attachmentFeature: AttachmentFeature = {
	kind: "attachment",
	matches(node): boolean {
		return Boolean(node.attachment);
	},
	preprocess(node): PreprocessedAttachmentNode {
		node._kind = "attachment";
		return node as unknown as PreprocessedAttachmentNode;
	},
	measure: measureAttachment,
	layout: layoutAttachment,
	place: placeAttachment,
	render(node, context): void {
		renderAttachment(node, context);
	},
};
