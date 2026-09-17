import type {
	LayoutNodeBase,
	LayoutPdfNode,
	MeasuredNodeBase,
	MeasuredPdfNode,
	PreprocessedNodeBase,
	PreprocessedPdfNode,
} from "../../types/internal";

export type PreprocessedStackNode = PreprocessedNodeBase & {
	_kind: "stack";
	stack: PreprocessedPdfNode[];
};

export type MeasuredStackNode = MeasuredNodeBase & {
	_kind: "stack";
	stack: MeasuredPdfNode[];
};

export type LayoutStackNode = LayoutNodeBase & {
	_kind: "stack";
	stack: LayoutPdfNode[];
};
