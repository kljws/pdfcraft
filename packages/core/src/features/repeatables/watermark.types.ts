import type { Color } from "../../types";
import type { MeasuredWatermark, PageSize, PdfPage } from "../../types/internal";

export type { MeasuredWatermark, WatermarkSize } from "../../types/internal";

export interface WatermarkDefinition {
	text: string;
	font?: string;
	fontSize?: number | "auto";
	color?: Color;
	opacity?: number;
	bold?: boolean;
	italics?: boolean;
	angle?: number | null;
}

export interface NormalizedWatermark extends WatermarkDefinition {
	font: string;
	fontSize: number;
	color: Color;
	opacity: number;
	bold: boolean;
	italics: boolean;
	angle: number;
}

export interface WatermarkLayoutContext {
	pages: PdfPage[];
	measureWatermark(watermark: WatermarkDefinition, pageSize: PageSize): MeasuredWatermark;
}
