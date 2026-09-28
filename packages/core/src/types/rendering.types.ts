import type { Color, FontDescriptors, VfsEncoding } from "./index";
import type { LayoutPdfNode, Metadata } from "./document.types";
import type { PageMargins, PageSize, Point, Position } from "./layout.types";
import type { LineLike } from "./text.types";

export type Vector = {
	type: "line" | "rect" | "ellipse" | "polyline" | "path";
	x?: number | undefined;
	y?: number | undefined;
	x1?: number | undefined;
	y1?: number | undefined;
	x2?: number | undefined;
	y2?: number | undefined;
	w?: number | undefined;
	h?: number | undefined;
	r?: number | undefined;
	r1?: number | undefined;
	r2?: number | undefined;
	points?: Point[] | undefined;
	lineWidth?: number | undefined;
	lineColor?: Color | PDFKit.Mixins.ColorValue | undefined;
	color?: Color | PDFKit.Mixins.ColorValue | undefined;
	fillOpacity?: number | undefined;
	lineOpacity?: number | undefined;
	strokeOpacity?: number | undefined;
	dash?: { length: number; space?: number | undefined; phase?: number | undefined } | undefined;
	linearGradient?: string[] | undefined;
	d?: string | undefined;
	closePath?: boolean | undefined;
	lineCap?: string | undefined;
	lineJoin?: string | undefined;
	resetXY?: (() => void) | undefined;
	_isFillColorFromUnbreakable?: boolean | undefined;
	_node?: LayoutPdfNode | undefined;
	_position?: Position | undefined;
};

/**
 * Positioned node emitted by a feature's placement hook. Its `type` is the emitting feature's
 * kind; layout and rendering treat it generically and dispatch it back to that feature.
 */
export type FeaturePageItem = {
	type: "image" | "extension" | "attachment" | "acroform";
	item: LayoutPdfNode;
};

export type VectorPageItem = { type: "vector"; item: Vector };

export type PageItem =
	| VectorPageItem
	| { type: "line"; item: LineLike }
	| FeaturePageItem
	| {
			type: "beginClip" | "beginVerticalAlignment" | "endVerticalAlignment";
			item: PageControlItem;
	  }
	| { type: "endClip"; item?: never | undefined };

export type PageControlItem = {
	x?: number | undefined;
	y?: number | undefined;
	width?: number | undefined;
	height?: number | undefined;
	verticalAlignment?: string | undefined;
};

export type PdfPage = {
	items: PageItem[];
	pageSize: PageSize;
	pageMargins: PageMargins;
	customProperties: Metadata;
	watermark?: unknown;
	height?: number | undefined;
};

export type WatermarkSize = {
	size: { width: number; height: number };
	rotatedSize: { width: number; height: number };
};

export type MeasuredWatermark = {
	text: string;
	fontSize: number;
	color: Color;
	opacity: number;
	bold: boolean;
	italics: boolean;
	angle: number;
	font: unknown;
	_size: WatermarkSize;
};

export type FontContainer = {
	vfs: Record<string, string | { data: string; encoding?: VfsEncoding | undefined }>;
	fonts: FontDescriptors;
};
