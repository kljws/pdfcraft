import type {
	Inline,
	LayoutPdfNode,
	LayoutNodeBase,
	MeasuredPdfNode,
	MeasuredNodeBase,
	PreprocessedPdfNode,
	PreprocessedNodeBase,
	TextMeasurement,
	Vector,
} from "../../types/internal";

export type ListMarker = {
	canvas?: Vector[] | undefined;
	_inlines?: Inline[] | undefined;
	_minWidth: number;
	_maxWidth: number;
	_minHeight?: number | undefined;
	_maxHeight?: number | undefined;
};

/** State the list feature attaches to each of its items, whatever their own kind. */
export type ListItemState = {
	listMarker?: ListMarker | undefined;
};

export type MeasuredListItem = MeasuredPdfNode & ListItemState;
export type LayoutListItem = LayoutPdfNode & ListItemState;

export type PreprocessedListNode = PreprocessedNodeBase & {
	_kind: "list";
	ul?: PreprocessedPdfNode[] | undefined;
	ol?: PreprocessedPdfNode[] | undefined;
};

export type ListMeasureNode = MeasuredNodeBase & {
	_kind: "list";
	ul?: MeasuredListItem[] | undefined;
	ol?: MeasuredListItem[] | undefined;
};

export type ListMetrics = {
	gapSize: TextMeasurement;
};

export type MeasuredListNode = ListMeasureNode & {
	metrics: ListMetrics;
};

export type LayoutListNode = LayoutNodeBase & {
	_kind: "list";
	ul?: LayoutListItem[] | undefined;
	ol?: LayoutListItem[] | undefined;
	metrics: ListMetrics;
};

declare module "../../types/document.types" {
	interface NodeKindRegistry {
		list: {
			preprocessed: PreprocessedListNode;
			measure: ListMeasureNode;
			measured: MeasuredListNode;
			layout: LayoutListNode;
		};
	}
}
