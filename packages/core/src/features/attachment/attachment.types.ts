import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";

export type AttachmentSource = NonNullable<PreprocessedPdfNode["attachment"]>;

export type PreprocessedAttachmentNode = PreprocessedPdfNode & {
	_kind: "attachment";
	attachment: AttachmentSource;
};

export type MeasuredAttachmentNode = MeasuredPdfNode & PreprocessedAttachmentNode;

export type LayoutAttachmentNode = LayoutPdfNode & MeasuredAttachmentNode;
