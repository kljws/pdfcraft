import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";

export type ImageSource = string | Uint8Array;

export type PreprocessedImageNode = PreprocessedPdfNode & {
	_kind: "image";
	image: ImageSource;
};

export type MeasuredImageNode = MeasuredPdfNode & PreprocessedImageNode;

export type LayoutImageNode = LayoutPdfNode & MeasuredImageNode;
