import { markNodeKind } from "../../utils/node";
import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import type { PageItem, PdfNode } from "../../types/internal";
import type { PrinterDocumentDefinition, PrinterResourceReference } from "../../core/printer.types";
import { layoutFeatureItem } from "../../layout/element-writer.helpers";
import { isNumber } from "../../utils/variable-type";
import { placeAttachmentItem } from "./place-attachment";
import { renderAttachment, type AttachmentRenderContext } from "./render-attachment";
import { resolveAttachmentReferences } from "./attachment-resources";
import type {
	LayoutAttachmentNode,
	MeasuredAttachmentNode,
	PreprocessedAttachmentNode,
} from "./attachment.types";

export interface AttachmentResourceContext {
	resolve(resource: PrinterResourceReference): string;
}

interface AttachmentFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedAttachmentNode;
	measureNode: PreprocessedAttachmentNode;
	measuredNode: MeasuredAttachmentNode;
	layoutNode: LayoutAttachmentNode;
	renderNode: LayoutAttachmentNode;
	preprocessContext: undefined;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: AttachmentRenderContext;
	resourceSource: PrinterDocumentDefinition;
	resolvedResources: undefined;
	resolveResourcesContext: AttachmentResourceContext;
	pageItem: Extract<PageItem, { type: "attachment" }>;
}

interface AttachmentFeature extends NodeFeature<AttachmentFeatureStages> {
	readonly kind: "attachment";
	preprocess(node: PdfNode): PreprocessedAttachmentNode;
	resolveResources(
		document: PrinterDocumentDefinition,
		context: AttachmentResourceContext,
	): undefined;
	measure(node: PreprocessedAttachmentNode, context: NodeMeasureContext): MeasuredAttachmentNode;
	place(
		node: LayoutAttachmentNode,
		context: NodePlaceContext,
	): ReturnType<typeof placeAttachmentItem>;
	layout(node: LayoutAttachmentNode, context: NodeLayoutContext): void;
	render(node: LayoutAttachmentNode, context: AttachmentRenderContext): void;
}

export const attachmentFeature = {
	kind: "attachment",
	matches(node): boolean {
		return Boolean(node.attachment);
	},
	preprocess(node): PreprocessedAttachmentNode {
		return markNodeKind(node, "attachment");
	},
	resolveResources(document, { resolve }): undefined {
		resolveAttachmentReferences(document, resolve);
	},
	measure(node): MeasuredAttachmentNode {
		const measuredNode = node as MeasuredAttachmentNode;
		measuredNode._width = isNumber(node.width) ? node.width : 7;
		measuredNode._height = isNumber(node.height) ? node.height : 18;
		return measuredNode;
	},
	layout(node, context): void {
		layoutFeatureItem("attachment", node, context.writer);
	},
	place: placeAttachmentItem,
	render(node, context): void {
		renderAttachment(node, context);
	},
} satisfies AttachmentFeature;
