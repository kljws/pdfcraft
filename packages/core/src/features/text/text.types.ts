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

export interface BrokenWord {
	text: string;
	lineEnd?: boolean;
}

export interface BrokenInline extends Record<string, unknown> {
	text: string;
	image?: PdfNode["image"];
	acroform?: PdfNode["acroform"];
	lineEnd?: boolean;
	noNewLine?: boolean;
}

export interface InlineMeasurement {
	items: Inline[];
	minWidth: number;
	maxWidth: number;
}

/** References resolved from `pageReference` and `textReference` during preprocessing. */
export interface TextReferenceState<Node> {
	_pageRef?: NodeReference<Node>;
	_textRef?: NodeReference<Node>;
}

export type PreprocessedTextNode = PreprocessedNodeBase &
	TextReferenceState<PreprocessedPdfNode> & {
		_kind: "text";
		text: NonNullable<NodeText<PreprocessedPdfNode>>;
	};

export interface TextMetrics {
	inlines: Inline[];
}

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

export interface DecorationGroup {
	line: LineLike;
	decoration: Decoration;
	decorationColor: ResolvedColor;
	decorationStyle: "solid" | "double" | "dashed" | "dotted" | "wavy";
	decorationThickness: number | null;
	inlines: Inline[];
}

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
