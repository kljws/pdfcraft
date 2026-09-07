import type { AcroFormDefinition, Color, Decoration } from "./index";
import type {
	LayoutPdfNode,
	MeasuredPdfNode,
	NodeReference,
	SerializedBuffer,
} from "./document.types";
import type { OutlineDefinition, Position } from "./layout.types";
import type { Vector } from "./rendering.types";

export interface TextMeasurement {
	width: number;
	height: number;
	fontSize: number;
	lineHeight: number;
	descender: number;
	ascender: number;
}

export interface ListMarker {
	canvas?: Vector[];
	_inlines?: Inline[];
	_minWidth: number;
	_maxWidth: number;
	_minHeight?: number;
	_maxHeight?: number;
}

export interface PdfFont {
	ascender: number;
	descender: number;
	lineHeight(size: number): number;
	widthOfString(text: string, size: number, features?: unknown): number;
}

export interface Inline {
	text: string;
	image?: string | Uint8Array | SerializedBuffer;
	acroform?: AcroFormDefinition;
	_imageWidth?: number;
	_imageHeight?: number;
	width: number;
	height: number;
	x: number;
	leadingCut: number;
	trailingCut: number;
	lineEnd?: boolean;
	noNewLine?: boolean;
	noWrap?: boolean | null;
	font: PdfFont;
	fontSize: number;
	alignment?: string | null;
	color?: Color | null;
	background?: Color | null;
	decoration?: Decoration | Decoration[] | null;
	decorationColor?: Color | null;
	decorationStyle?: string | null;
	decorationThickness?: number | null;
	characterSpacing?: number;
	fontFeatures?: unknown;
	link?: string | null;
	linkToPage?: number | null;
	linkToDestination?: string | null;
	opacity?: number;
	sup?: boolean;
	sub?: boolean;
	_node?: LayoutPdfNode;
	_position?: Position;
	_tocItemRef?: MeasuredPdfNode | LayoutPdfNode;
	_pageNodeRef?: MeasuredPdfNode | LayoutPdfNode;
	_pageRef?: NodeReference<MeasuredPdfNode | LayoutPdfNode>;
	justifyShift?: number;
	_outline?: OutlineDefinition;
	id?: string;
}

export interface LineLike {
	inlines: Inline[];
	x?: number;
	y?: number;
	_node?: LayoutPdfNode;
	lastLineInParagraph?: boolean;
	newLineForced?: boolean;
	getAvailableWidth(): number;
	addInline(inline: Inline): void;
	hasEnoughSpaceForInline(inline: Inline, nextInlines?: Inline[]): boolean;
	getHeight(): number;
	getWidth(): number;
	getAscenderHeight(): number;
	clone(): LineLike;
	_outline?: OutlineDefinition;
	_pageNodeRef?: MeasuredPdfNode | LayoutPdfNode;
	id?: string;
}
