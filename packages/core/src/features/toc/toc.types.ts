import type {
	LayoutNodeBase,
	LayoutPdfNode,
	MeasuredNodeBase,
	MeasuredPdfNode,
	PreprocessedNodeBase,
	PreprocessedPdfNode,
	TocDefinition,
} from "../../types/internal";

export type PreprocessedTocNode = PreprocessedNodeBase & {
	_kind: "toc";
	toc: TocDefinition<PreprocessedPdfNode>;
};

export type MeasuredTocNode = MeasuredNodeBase & {
	_kind: "toc";
	toc: TocDefinition<MeasuredPdfNode>;
};

export type LayoutTocNode = LayoutNodeBase & {
	_kind: "toc";
	toc: TocDefinition<LayoutPdfNode>;
};

declare module "../../types/document.types" {
	interface NodeKindRegistry {
		toc: {
			preprocessed: PreprocessedTocNode;
			measure: MeasuredTocNode;
			measured: MeasuredTocNode;
			layout: LayoutTocNode;
		};
	}
}
