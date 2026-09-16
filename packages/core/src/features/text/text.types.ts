import type { Decoration } from "../../types";
import type {
	Inline,
	LayoutPdfNode,
	LineLike,
	MeasuredPdfNode,
	PdfNode,
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

export type PreprocessedTextNode = PreprocessedPdfNode & {
	_kind: "text";
	text: NonNullable<PreprocessedPdfNode["text"]>;
};

export interface TextMetrics {
	inlines: Inline[];
}

export type TextMeasureNode = MeasuredPdfNode & PreprocessedTextNode;

export type MeasuredTextNode = TextMeasureNode & {
	metrics: TextMetrics;
};

export type LayoutTextNode = LayoutPdfNode & MeasuredTextNode;

export interface DecorationGroup {
	line: LineLike;
	decoration: Decoration;
	decorationColor: ResolvedColor;
	decorationStyle: "solid" | "double" | "dashed" | "dotted" | "wavy";
	decorationThickness: number | null;
	inlines: Inline[];
}
