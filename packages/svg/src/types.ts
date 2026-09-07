import type { ContentBase, Dictionary, ResourceSource } from "@pdfcraft/core/types";

export interface SvgDimensions {
	width?: number;
	height?: number;
}

export interface SvgElement {
	getAttribute(name: string): string | null;
	hasAttribute(name: string): boolean;
	setAttribute(name: string, value: string): void;
}

export type SvgToPdfColor = [[number, number, number], number];

export interface SvgToPdfFontOptions {
	fauxItalic: boolean;
	fauxBold: boolean;
}

export interface SvgToPdfOptions {
	width?: number;
	height?: number;
	preserveAspectRatio?: string;
	useCSS?: boolean;
	fontCallback?: (
		family: string,
		bold: boolean,
		italic: boolean,
		fontOptions: SvgToPdfFontOptions,
	) => string;
	imageCallback?: (link: string) => string;
	documentCallback?: (file: string) => SvgElement | string | Array<SvgElement | string>;
	colorCallback?: (color: SvgToPdfColor) => SvgToPdfColor;
	warningCallback?: (warning: string) => void;
	assumePt?: boolean;
	precision?: number;
}

export interface SvgNode extends ContentBase {
	svg: string | SvgElement;
	width?: number;
	height?: number;
	fit?: [number, number];
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	maxHeight?: number;
	options?: SvgToPdfOptions;
}

declare global {
	interface PdfCraftContentExtensionRegistry {
		svg: SvgNode;
	}

	interface PdfCraftDocumentExtensionRegistry {
		svgs?: Dictionary<ResourceSource>;
	}
}
