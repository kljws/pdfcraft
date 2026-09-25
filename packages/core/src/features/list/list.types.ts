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

export interface ListMarker {
	canvas?: Vector[];
	_inlines?: Inline[];
	_minWidth: number;
	_maxWidth: number;
	_minHeight?: number;
	_maxHeight?: number;
}

/** State the list feature attaches to each of its items, whatever their own kind. */
export interface ListItemState {
	listMarker?: ListMarker;
}

export type MeasuredListItem = MeasuredPdfNode & ListItemState;
export type LayoutListItem = LayoutPdfNode & ListItemState;

export interface PreprocessedListNode extends PreprocessedNodeBase {
	_kind: "list";
	ul?: PreprocessedPdfNode[];
	ol?: PreprocessedPdfNode[];
}

export interface ListMeasureNode extends MeasuredNodeBase {
	_kind: "list";
	ul?: MeasuredListItem[];
	ol?: MeasuredListItem[];
}

export interface ListMetrics {
	gapSize: TextMeasurement;
}

export interface MeasuredListNode extends ListMeasureNode {
	metrics: ListMetrics;
}

export interface LayoutListNode extends LayoutNodeBase {
	_kind: "list";
	ul?: LayoutListItem[];
	ol?: LayoutListItem[];
	metrics: ListMetrics;
}

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
