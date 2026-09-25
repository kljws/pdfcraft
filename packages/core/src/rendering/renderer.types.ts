import type { Color, PatternDefinition } from "../types";
import type { AttachmentSource, MeasuredWatermark, PdfPage } from "../types/internal";

export type { EmbeddedFont, FontFile, FontStyle } from "../services/typography/font.types";

export interface EmbeddedImage {
	width: number;
	height: number;
	orientation: number;
	embed(document: PDFKit.PDFDocument): void;
}

export type { PatternDefinition } from "../types";

export interface AttachmentDefinition extends PDFKit.Mixins.PDFAttachmentOptions {
	src: AttachmentSource["src"];
}

export type PdfDocumentOptions = Omit<PDFKit.PDFDocumentOptions, "font"> & {
	font?: string | null;
};

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

export type ResolvedColor = PDFKit.Mixins.ColorValue;
export type PatternColor = [PDFKit.PDFTilingPattern, PDFKit.Mixins.TilingPatternColorValue];
export type InputColor = Color | PDFKit.Mixins.ColorValue | null | undefined;
