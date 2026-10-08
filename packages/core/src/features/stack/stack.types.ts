import type { Color } from "../../types";
import type {
	LayoutNodeBase,
	LayoutPdfNode,
	MeasuredNodeBase,
	MeasuredPdfNode,
	PreprocessedNodeBase,
	PreprocessedPdfNode,
} from "../../types/internal";

/** Decoration a stack draws around its items, resolved from its public properties. */
export type StackDecoration = {
	borderRadius: number;
	borderWidth: number;
	borderColor: Color;
	backgroundColor?: Color | undefined;
	padding: [left: number, top: number, right: number, bottom: number];
};

export type PreprocessedStackNode = PreprocessedNodeBase & {
	_kind: "stack";
	stack: PreprocessedPdfNode[];
	_decoration?: StackDecoration | undefined;
};

export type MeasuredStackNode = MeasuredNodeBase & {
	_kind: "stack";
	stack: MeasuredPdfNode[];
	_decoration?: StackDecoration | undefined;
	/** Minimum width of the items, inside the decoration. */
	_contentMinWidth?: number | undefined;
};

export type LayoutStackNode = LayoutNodeBase & {
	_kind: "stack";
	stack: LayoutPdfNode[];
	_decoration?: StackDecoration | undefined;
	_contentMinWidth?: number | undefined;
};

declare module "../../types/document.types" {
	interface NodeKindRegistry {
		stack: {
			preprocessed: PreprocessedStackNode;
			measure: MeasuredStackNode;
			measured: MeasuredStackNode;
			layout: LayoutStackNode;
		};
	}
}
