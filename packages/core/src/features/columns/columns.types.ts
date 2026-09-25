import type {
	ColumnNode,
	LayoutNodeBase,
	LayoutPdfNode,
	MeasuredNodeBase,
	MeasuredPdfNode,
	PreprocessedNodeBase,
	PreprocessedPdfNode,
} from "../../types/internal";

export type PreprocessedColumnsNode = PreprocessedNodeBase & {
	_kind: "columns";
	columns: ColumnNode<PreprocessedPdfNode>[];
};

export type MeasuredColumnsNode = MeasuredNodeBase & {
	_kind: "columns";
	columns: ColumnNode<MeasuredPdfNode>[];
};

export type LayoutColumnsNode = LayoutNodeBase & {
	_kind: "columns";
	columns: ColumnNode<LayoutPdfNode>[];
};

declare module "../../types/document.types" {
	interface NodeKindRegistry {
		columns: {
			preprocessed: PreprocessedColumnsNode;
			measure: MeasuredColumnsNode;
			measured: MeasuredColumnsNode;
			layout: LayoutColumnsNode;
		};
	}
}
