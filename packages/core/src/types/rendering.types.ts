import type {
	Color,
	Dictionary,
	FontDescriptors,
	LocalAccessPolicy,
	VfsEncoding,
	VirtualFileSystem,
} from "./index";
import type { LayoutPdfNode, Metadata } from "./document.types";
import type { PageMargins, PageSize, Point, Position } from "./layout.types";
import type { LineLike } from "./text.types";

export interface Vector {
	type: "line" | "rect" | "ellipse" | "polyline" | "path";
	x?: number;
	y?: number;
	x1?: number;
	y1?: number;
	x2?: number;
	y2?: number;
	w?: number;
	h?: number;
	r?: number;
	r1?: number;
	r2?: number;
	points?: Point[];
	lineWidth?: number;
	lineColor?: Color | PDFKit.Mixins.ColorValue;
	color?: Color | PDFKit.Mixins.ColorValue;
	fillOpacity?: number;
	lineOpacity?: number;
	strokeOpacity?: number;
	dash?: { length: number; space?: number; phase?: number };
	linearGradient?: string[];
	d?: string;
	closePath?: boolean;
	lineCap?: string;
	lineJoin?: string;
	resetXY?: () => void;
	_isFillColorFromUnbreakable?: boolean;
	_node?: LayoutPdfNode;
	_position?: Position;
}

export type PageItem =
	| { type: "vector"; item: Vector }
	| { type: "line"; item: LineLike }
	| { type: "image" | "extension" | "attachment" | "acroform"; item: LayoutPdfNode }
	| {
			type: "beginClip" | "beginVerticalAlignment" | "endVerticalAlignment";
			item: PageControlItem;
	  }
	| { type: "endClip"; item?: never };

export interface PageControlItem {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	verticalAlignment?: string;
}

export interface PdfPage {
	items: PageItem[];
	pageSize: PageSize;
	pageMargins: PageMargins;
	customProperties: Metadata;
	watermark?: unknown;
	height?: number;
}

export interface FontContainer {
	vfs: Record<string, string | { data: string; encoding?: VfsEncoding }>;
	fonts: FontDescriptors;
}

export interface PrinterDependencies {
	fonts: FontDescriptors | Dictionary;
	virtualfs: VirtualFileSystem;
	localAccessPolicy?: LocalAccessPolicy;
}

export type ProgressCallback = (progress: number) => void;
export type VoidCallback = () => void;
