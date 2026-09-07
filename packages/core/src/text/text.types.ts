import type { Decoration } from "../types";
import type { Inline, LineLike, PdfFont, PdfNode } from "../types/internal";
import type { ResolvedColor } from "../rendering/renderer.types";

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

export interface TextSize {
	width: number;
	height: number;
	fontSize: number;
	lineHeight: number;
	ascender: number;
	descender: number;
}

export interface TextFontProvider {
	provideFont(familyName: string, bold: boolean, italics: boolean): PdfFont;
}

export interface DecorationGroup {
	line: LineLike;
	decoration: Decoration;
	decorationColor: ResolvedColor;
	decorationStyle: "solid" | "double" | "dashed" | "dotted" | "wavy";
	decorationThickness: number | null;
	inlines: Inline[];
}
