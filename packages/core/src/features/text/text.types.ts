import type { Decoration } from "../../types";
import type {
	Inline,
	LayoutNodeBase,
	LayoutPdfNode,
	LineLike,
	MeasuredNodeBase,
	MeasuredPdfNode,
	NodeReference,
	NodeText,
	PdfNode,
	PreprocessedNodeBase,
	PreprocessedPdfNode,
} from "../../types/internal";
import type { ResolvedColor } from "../../rendering/renderer.types";

export type TextFragment = string | number | boolean | null | undefined | PdfNode;

export type BrokenWord = {
	text: string;
	lineEnd?: boolean | undefined;
};

export type BrokenInline = Record<string, unknown> & {
	text: string;
	image?: PdfNode["image"] | undefined;
	acroform?: PdfNode["acroform"] | undefined;
	lineEnd?: boolean | undefined;
	noNewLine?: boolean | undefined;
};

export type InlineMeasurement = {
	items: Inline[];
	minWidth: number;
	maxWidth: number;
};

/** References resolved from `pageReference` and `textReference` during preprocessing. */
// Kept as an interface: it takes part in the recursive node types and breaks the cycle.
export interface TextReferenceState<Node> {
	_pageRef?: NodeReference<Node> | undefined;
	_textRef?: NodeReference<Node> | undefined;
	/**
	 * Complete page number measured for a page reference or TOC number. Inline fragments copy it,
	 * so a number wrapped across lines is still compared as a whole.
	 */
	_pageReferenceText?: string | undefined;
}

export type PreprocessedTextNode = PreprocessedNodeBase &
	TextReferenceState<PreprocessedPdfNode> & {
		_kind: "text";
		text: NonNullable<NodeText<PreprocessedPdfNode>>;
	};

export type TextMetrics = {
	inlines: Inline[];
};

export type TextMeasureNode = MeasuredNodeBase &
	TextReferenceState<MeasuredPdfNode> & {
		_kind: "text";
		text: NonNullable<NodeText<MeasuredPdfNode>>;
	};

export type MeasuredTextNode = TextMeasureNode & {
	metrics: TextMetrics;
};

export type LayoutTextNode = LayoutNodeBase &
	TextReferenceState<LayoutPdfNode> & {
		_kind: "text";
		text: NonNullable<NodeText<LayoutPdfNode>>;
		metrics: TextMetrics;
	};

export type DecorationGroup = {
	line: LineLike;
	decoration: Decoration;
	decorationColor: ResolvedColor;
	decorationStyle: "solid" | "double" | "dashed" | "dotted" | "wavy";
	decorationThickness: number | null;
	inlines: Inline[];
};

declare module "../../types/document.types" {
	interface NodeKindRegistry {
		text: {
			preprocessed: PreprocessedTextNode;
			measure: TextMeasureNode;
			measured: MeasuredTextNode;
			layout: LayoutTextNode;
		};
	}
}
