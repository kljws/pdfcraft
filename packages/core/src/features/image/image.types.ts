import type {
	LayoutNodeBase,
	MeasuredNodeBase,
	PdfNode,
	PreprocessedNodeBase,
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
};
