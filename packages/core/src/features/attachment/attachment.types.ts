import type {
	AttachmentSource as AttachmentSourceDefinition,
	LayoutNodeBase,
	MeasuredNodeBase,
	PdfNode,
	PreprocessedNodeBase,
} from "../../types/internal";

export type AttachmentSource = NonNullable<PdfNode["attachment"]>;

export type PreprocessedAttachmentNode = PreprocessedNodeBase & {
	_kind: "attachment";
	attachment: AttachmentSource;
};

export type MeasuredAttachmentNode = MeasuredNodeBase & {
	_kind: "attachment";
	attachment: AttachmentSource;
};

export type LayoutAttachmentNode = LayoutNodeBase & {
	_kind: "attachment";
	attachment: AttachmentSource;
};

declare module "../../types/document.types" {
	interface NodeHierarchy<Node> {
		attachment?: string | AttachmentSourceDefinition | undefined;
	}

	interface PdfNode {
		icon?: string | undefined;
	}

	interface NodeKindRegistry {
		attachment: {
			preprocessed: PreprocessedAttachmentNode;
			measure: MeasuredAttachmentNode;
			measured: MeasuredAttachmentNode;
			layout: LayoutAttachmentNode;
			pageItem: true;
		};
	}
}
