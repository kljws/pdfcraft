import type {
	LayoutNodeBase,
	LayoutPdfNode,
	MeasuredNodeBase,
	MeasuredPdfNode,
	PreprocessedNodeBase,
	PreprocessedPdfNode,
} from "../../types/internal";

export type PreprocessedSectionNode = PreprocessedNodeBase & {
	_kind: "section";
	section: PreprocessedPdfNode;
};

export type MeasuredSectionNode = MeasuredNodeBase & {
	_kind: "section";
	section: MeasuredPdfNode;
};

export type LayoutSectionNode = LayoutNodeBase & {
	_kind: "section";
	section: LayoutPdfNode;
};

declare module "../../types/document.types" {
	interface NodeKindRegistry {
		section: {
			preprocessed: PreprocessedSectionNode;
			measure: MeasuredSectionNode;
			measured: MeasuredSectionNode;
			layout: LayoutSectionNode;
		};
	}
}
