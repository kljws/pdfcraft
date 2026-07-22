import type {
	Color,
	Dictionary,
	FontDescriptors,
	PatternDefinition,
	VirtualFileSystem,
} from "../types";
import type { MeasuredWatermark } from "../layout/layout-builder.types";
import type { PdfFont, PdfPage, Position } from "../types/internal";

export type FontStyle = "normal" | "bold" | "italics" | "bolditalics";
export type FontFile = string | Uint8Array | ArrayBuffer;

export interface EmbeddedFont extends PdfFont {
	encode?(text: string, features?: unknown): unknown;
	font: {
		postscriptName: string;
	};
}

export interface EmbeddedImage {
	width: number;
	height: number;
	orientation: number;
	embed(document: PDFKit.PDFDocument): void;
}

export type { PatternDefinition } from "../types";

export interface AttachmentDefinition extends PDFKit.Mixins.PDFAttachmentOptions {
	src: FontFile;
}

export type PdfDocumentOptions = Omit<PDFKit.PDFDocumentOptions, "font"> & {
	font?: string | null;
};

export interface PdfDocumentResources {
	fonts?: FontDescriptors;
	images?: Dictionary<string>;
	patterns?: Dictionary<PatternDefinition>;
	attachments?: Dictionary<AttachmentDefinition>;
	virtualFileSystem?: VirtualFileSystem | null;
}

export interface PageNodeReference {
	positions?: Position[];
}

export interface RenderablePage extends PdfPage {
	watermark?: MeasuredWatermark;
}

export interface ClipRectangle {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface VerticalAlignmentItem {
	isCellContentMultiPage: boolean;
	verticalAlignment?: "top" | "middle" | "bottom";
	getNodeHeight(): number;
	getViewHeight(): number;
}

export interface FileAnnotationOptions {
	Name?: string;
	AP?: {
		N: {
			Type: "XObject";
			Subtype: "Form";
			FormType: 1;
			BBox: [number, number, number, number];
		};
	};
}

export interface RendererTextOptions extends PDFKit.Mixins.TextOptions {
	textWidth: number;
	wordCount: number;
}

export type ResolvedColor = PDFKit.Mixins.ColorValue;
export type PatternColor = [PDFKit.PDFTilingPattern, PDFKit.Mixins.TilingPatternColorValue];
export type InputColor = Color | PDFKit.Mixins.ColorValue | null | undefined;
