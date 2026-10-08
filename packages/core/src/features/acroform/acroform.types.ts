import type { AcroFormDefinition } from "../../types";
import type {
	Inline,
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
	_formFont?: PdfFont | undefined;
};

export type LayoutAcroFormNode = LayoutNodeBase & {
	_kind: "acroform";
	acroform: NonNullable<PdfNode["acroform"]>;
	/** Font resolved at measurement for the form field appearance. */
	_formFont?: PdfFont | undefined;
};

/** A form field inside a text line: an inline holding the field definition of its fragment. */
export type AcroFormInline = Inline & {
	acroform?: NonNullable<PdfNode["acroform"]> | undefined;
};

declare module "../../types/document.types" {
	interface NodeHierarchy<Node> {
		acroform?: AcroFormDefinition | undefined;
	}

	interface NodeKindRegistry {
		acroform: {
			preprocessed: PreprocessedAcroFormNode;
			measure: MeasuredAcroFormNode;
			measured: MeasuredAcroFormNode;
			layout: LayoutAcroFormNode;
			pageItem: true;
		};
	}
}
