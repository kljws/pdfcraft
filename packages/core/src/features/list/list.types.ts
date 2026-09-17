import type {
	LayoutPdfNode,
	LayoutNodeBase,
	MeasuredPdfNode,
	MeasuredNodeBase,
	PreprocessedPdfNode,
	PreprocessedNodeBase,
	TextMeasurement,
} from "../../types/internal";

export interface PreprocessedListNode extends PreprocessedNodeBase {
	_kind: "list";
	ul?: PreprocessedPdfNode[];
	ol?: PreprocessedPdfNode[];
}

export interface ListMeasureNode extends MeasuredNodeBase {
	_kind: "list";
	ul?: MeasuredPdfNode[];
	ol?: MeasuredPdfNode[];
}

export interface ListMetrics {
	gapSize: TextMeasurement;
}

export interface MeasuredListNode extends ListMeasureNode {
	metrics: ListMetrics;
}

export interface LayoutListNode extends LayoutNodeBase {
	_kind: "list";
	ul?: LayoutPdfNode[];
	ol?: LayoutPdfNode[];
	metrics: ListMetrics;
}
