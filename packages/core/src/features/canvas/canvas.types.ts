import type {
	LayoutNodeBase,
	MeasuredNodeBase,
	PdfNode,
	PreprocessedNodeBase,
} from "../../types/internal";

export type PreprocessedCanvasNode = PreprocessedNodeBase & {
	_kind: "canvas";
	canvas: NonNullable<PdfNode["canvas"]>;
};

export type MeasuredCanvasNode = MeasuredNodeBase & {
	_kind: "canvas";
	canvas: NonNullable<PdfNode["canvas"]>;
};

export type LayoutCanvasNode = LayoutNodeBase & {
	_kind: "canvas";
	canvas: NonNullable<PdfNode["canvas"]>;
};
