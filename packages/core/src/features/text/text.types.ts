import type { Color, Decoration } from "../../types";
import type {
	Inline,
	InlineContentBox,
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
	lineEnd?: boolean | undefined;
	noNewLine?: boolean | undefined;
};

/**
 * Content of another feature that text places in its lines as one box, such as an inline image or
 * form field. The owning feature recognizes and measures it; composition supplies these types.
 */
export type InlineContentType = InlineContentBox & {
	/** Whether a text fragment is this content (for example `{ image }`). */
	matches(fragment: Record<string, unknown>): boolean;
	/** The box never wraps; otherwise the fragment's `noWrap` style applies. */
	readonly noWrap: boolean;
	/** Measures the box and prepares its content for drawing; returns its size. */
	measure(inline: Inline): { width: number; height: number };
};

/** An inline of a text line, with the text-owned fields that its node passes on. */
export type TextInline = Inline & {
	_tocItemRef?: MeasuredPdfNode | LayoutPdfNode | undefined;
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
	/** Node whose page number this text shows, set on the number cells of a table of contents. */
	_tocItemRef?: Node | undefined;
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
	interface NodeHierarchy<Node> {
		text?: NodeText<Node> | undefined;
	}

	interface PdfNode {
		pageReference?: string | undefined;
		textReference?: string | undefined;
		outlineExpanded?: boolean | undefined;
		outlineParentId?: string | undefined;
		outlineText?: string | undefined;
		decoration?: Decoration | Decoration[] | undefined;
		decorationColor?: Color | undefined;
		decorationStyle?: string | undefined;
		decorationThickness?: number | undefined;
		leadingIndent?: number | undefined;
		wordBreak?: "normal" | "break-all" | undefined;
		preserveLeadingSpaces?: boolean | undefined;
		preserveTrailingSpaces?: boolean | undefined;
		sup?: boolean | undefined;
		sub?: boolean | undefined;
	}

	interface NodeKindRegistry {
		text: {
			preprocessed: PreprocessedTextNode;
			measure: TextMeasureNode;
			measured: MeasuredTextNode;
			layout: LayoutTextNode;
		};
	}
}
