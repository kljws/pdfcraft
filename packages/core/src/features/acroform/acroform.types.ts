import type {
	LayoutNodeBase,
	MeasuredNodeBase,
	PdfFont,
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
	/** Font resolved at measurement for the form field appearance. */
	_formFont?: PdfFont;
};

export type LayoutAcroFormNode = LayoutNodeBase & {
	_kind: "acroform";
	acroform: NonNullable<PdfNode["acroform"]>;
	/** Font resolved at measurement for the form field appearance. */
	_formFont?: PdfFont;
};

declare module "../../types/document.types" {
	interface NodeKindRegistry {
		acroform: {
			preprocessed: PreprocessedAcroFormNode;
			measure: MeasuredAcroFormNode;
			measured: MeasuredAcroFormNode;
			layout: LayoutAcroFormNode;
		};
	}
}
