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
	/** Horizontal gap between columns, resolved at measurement. */
	_gap?: number;
};

export type LayoutColumnsNode = LayoutNodeBase & {
	_kind: "columns";
	columns: ColumnNode<LayoutPdfNode>[];
	_gap?: number;
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
