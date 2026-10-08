import type {
	LayoutNodeBase,
	MeasuredNodeBase,
	PdfNode,
	PreprocessedNodeBase,
	Vector,
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

declare module "../../types/document.types" {
	interface NodeHierarchy<Node> {
		canvas?: Vector[] | undefined;
	}

	interface NodeKindRegistry {
		canvas: {
			preprocessed: PreprocessedCanvasNode;
			measure: MeasuredCanvasNode;
			measured: MeasuredCanvasNode;
			layout: LayoutCanvasNode;
		};
	}
}
