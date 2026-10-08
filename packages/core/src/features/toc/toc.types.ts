import type { Margin } from "../../types";
import type {
	LayoutNodeBase,
	LayoutPdfNode,
	MeasuredNodeBase,
	MeasuredPdfNode,
	NodeReference,
	NodeStyleValue,
	PdfNode,
	PreprocessedNodeBase,
	PreprocessedPdfNode,
} from "../../types/internal";

/** A table of contents as preprocessing normalizes it, with its entries collected in `_items`. */
export type TocDefinition<Node = PdfNode> = {
	id?: string | undefined;
	title?: Node | null | undefined;
	_items: NodeReference<Node>[];
	_pseudo?: boolean | undefined;
	_table?: Node | undefined;
	textStyle?: NodeStyleValue | undefined;
	numberStyle?: NodeStyleValue | undefined;
	textMargin?: Margin | undefined;
	sortBy?: "title" | undefined;
	sortLocale?: string | undefined;
	outlines?: boolean | undefined;
	hideEmpty?: boolean | undefined;
};

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
	interface NodeHierarchy<Node> {
		toc?: TocDefinition<Node> | undefined;
	}

	interface PdfNode {
		tocItem?: string | string[] | undefined;
		tocStyle?: NodeStyleValue | undefined;
		tocMargin?: Margin | undefined;
		tocNumberStyle?: NodeStyleValue | undefined;
	}

	interface NodeKindRegistry {
		toc: {
			preprocessed: PreprocessedTocNode;
			measure: MeasuredTocNode;
			measured: MeasuredTocNode;
			layout: LayoutTocNode;
		};
	}
}
