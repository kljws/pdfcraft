import type { Color } from "../../types";
import type {
	AttachmentSource,
	LayoutNodeBase,
	MeasuredNodeBase,
	PdfNode,
	PreprocessedNodeBase,
	SerializedBuffer,
} from "../../types/internal";

export type ImageSource = string | Uint8Array;

export type PreprocessedImageNode = PreprocessedNodeBase & {
	_kind: "image";
	image: Extract<NonNullable<PdfNode["image"]>, ImageSource>;
};

export type MeasuredImageNode = MeasuredNodeBase & {
	_kind: "image";
	image: ImageSource;
};

export type LayoutImageNode = LayoutNodeBase & {
	_kind: "image";
	image: ImageSource;
	shrinkToFit?: boolean | undefined;
};

declare module "../../types/document.types" {
	interface NodeHierarchy<Node> {
		image?: string | Uint8Array | SerializedBuffer | undefined;
	}

	interface PdfNode {
		linkToFile?: string | AttachmentSource | undefined;
		_imageBorderColor?: Color | undefined;
	}

	interface NodeKindRegistry {
		image: {
			preprocessed: PreprocessedImageNode;
			measure: MeasuredImageNode;
			measured: MeasuredImageNode;
			layout: LayoutImageNode;
			pageItem: true;
		};
	}
}
