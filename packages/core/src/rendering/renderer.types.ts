import type { Color } from "../types";
import type { AttachmentSource, MeasuredWatermark, PdfPage } from "../types/internal";

export type { EmbeddedFont, FontFile, FontStyle } from "../services/typography/font.types";

export type EmbeddedImage = {
	width: number;
	height: number;
	orientation: number;
	embed(document: PDFKit.PDFDocument): void;
};

export type { PatternDefinition } from "../types";

export type ResolvedAttachmentDefinition = PDFKit.Mixins.PDFAttachmentOptions & {
	src: AttachmentSource["src"];
};

export type PdfDocumentOptions = Omit<PDFKit.PDFDocumentOptions, "font"> & {
	font?: string | null | undefined;
};

export type RenderablePage = PdfPage & {
	watermark?: MeasuredWatermark | undefined;
};

export type ClipRectangle = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type VerticalAlignmentItem = {
	isCellContentMultiPage: boolean;
	verticalAlignment?: "top" | "middle" | "bottom" | undefined;
	getNodeHeight(): number;
	getViewHeight(): number;
};

export type FileAnnotationOptions = {
	Name?: string | undefined;
	AP?:
		| {
				N: {
					Type: "XObject";
					Subtype: "Form";
					FormType: 1;
					BBox: [number, number, number, number];
				};
		  }
		| undefined;
};

export type ResolvedColor = PDFKit.Mixins.ColorValue;
export type PatternColor = [PDFKit.PDFTilingPattern, PDFKit.Mixins.TilingPatternColorValue];
export type InputColor = Color | PDFKit.Mixins.ColorValue | null | undefined;
