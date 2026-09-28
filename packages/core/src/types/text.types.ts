import type { AcroFormDefinition, Color, Decoration } from "./index";
import type {
	LayoutPdfNode,
	MeasuredPdfNode,
	NodeReference,
	SerializedBuffer,
} from "./document.types";
import type { OutlineDefinition, Position } from "./layout.types";

export type TextMeasurement = {
	width: number;
	height: number;
	fontSize: number;
	lineHeight: number;
	descender: number;
	ascender: number;
};

export type PdfFont = {
	ascender: number;
	descender: number;
	lineHeight(size: number): number;
	widthOfString(text: string, size: number, features?: unknown): number;
};

export type Inline = {
	text: string;
	image?: string | Uint8Array | SerializedBuffer | undefined;
	acroform?: AcroFormDefinition | undefined;
	_imageWidth?: number | undefined;
	_imageHeight?: number | undefined;
	width: number;
	height: number;
	x: number;
	leadingCut: number;
	trailingCut: number;
	lineEnd?: boolean | undefined;
	noNewLine?: boolean | undefined;
	noWrap?: boolean | null | undefined;
	font: PdfFont;
	fontSize: number;
	alignment?: string | null | undefined;
	color?: Color | null | undefined;
	background?: Color | null | undefined;
	decoration?: Decoration | Decoration[] | null | undefined;
	decorationColor?: Color | null | undefined;
	decorationStyle?: string | null | undefined;
	decorationThickness?: number | null | undefined;
	characterSpacing?: number | undefined;
	fontFeatures?: unknown;
	link?: string | null | undefined;
	linkToPage?: number | null | undefined;
	linkToDestination?: string | null | undefined;
	opacity?: number | undefined;
	sup?: boolean | undefined;
	sub?: boolean | undefined;
	_node?: LayoutPdfNode | undefined;
	_position?: Position | undefined;
	_tocItemRef?: MeasuredPdfNode | LayoutPdfNode | undefined;
	_pageNodeRef?: MeasuredPdfNode | LayoutPdfNode | undefined;
	/** Complete page number this fragment belongs to, as measured. */
	_pageReferenceText?: string | undefined;
	_pageRef?: NodeReference<MeasuredPdfNode | LayoutPdfNode> | undefined;
	justifyShift?: number | undefined;
	_outline?: OutlineDefinition | undefined;
	id?: string | undefined;
};

export type LineLike = {
	inlines: Inline[];
	x?: number | undefined;
	y?: number | undefined;
	_node?: LayoutPdfNode | undefined;
	lastLineInParagraph?: boolean | undefined;
	newLineForced?: boolean | undefined;
	getAvailableWidth(): number;
	addInline(inline: Inline): void;
	hasEnoughSpaceForInline(inline: Inline, nextInlines?: Inline[]): boolean;
	getHeight(): number;
	getWidth(): number;
	getAscenderHeight(): number;
	clone(): LineLike;
	_outline?: OutlineDefinition | undefined;
	_pageNodeRef?: MeasuredPdfNode | LayoutPdfNode | undefined;
	_pageReferenceText?: string | undefined;
	id?: string | undefined;
};
