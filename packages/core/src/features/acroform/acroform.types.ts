import type {
	LayoutNodeBase,
	MeasuredNodeBase,
	PdfNode,
	PreprocessedNodeBase,
} from "../../types/internal";

export type PreprocessedAcroFormNode = PreprocessedNodeBase & {
	_kind: "acroform";
	acroform: NonNullable<PdfNode["acroform"]>;
};

export type MeasuredAcroFormNode = MeasuredNodeBase & {
	_kind: "acroform";
	acroform: NonNullable<PdfNode["acroform"]>;
};

export type LayoutAcroFormNode = LayoutNodeBase & {
	_kind: "acroform";
	acroform: NonNullable<PdfNode["acroform"]>;
};
