import type { Color } from "../types";
import type { LayoutPdfNode, PageItem, PdfPage, Vector } from "../types/internal";

export type VectorPageItem = Extract<PageItem, { type: "vector" }>;

export interface TablePageVectorRegistry {
	horizontalGroup?: object;
	horizontalItems: Set<VectorPageItem>;
	leftVerticals: Set<VectorPageItem>;
	rightVerticals: Set<VectorPageItem>;
	leftFillGroup?: object;
	leftFills: Set<VectorPageItem>;
	rightFillGroup?: object;
	rightFills: Set<VectorPageItem>;
}

export interface RowSpanData {
	left: number;
	rowSpan: number;
	width?: number;
}

export interface ResolvedTableLayout {
	defaultBorder: boolean;
	hLineWhenBroken?: boolean;
	hLineWidth(index: number, node: LayoutPdfNode): number;
	vLineWidth(index: number, node: LayoutPdfNode): number;
	hLineStyle(index: number, node: LayoutPdfNode): { dash?: Vector["dash"] } | null | undefined;
	vLineStyle(index: number, node: LayoutPdfNode): { dash?: Vector["dash"] } | null | undefined;
	hLineColor: Color | ((index: number, node: LayoutPdfNode, columnIndex?: number) => Color);
	vLineColor: Color | ((index: number, node: LayoutPdfNode, rowIndex?: number) => Color);
	paddingLeft(index: number, node: LayoutPdfNode): number;
	paddingRight(index: number, node: LayoutPdfNode): number;
	paddingTop(index: number, node: LayoutPdfNode): number;
	paddingBottom(index: number, node: LayoutPdfNode): number;
	fillColor?:
		| Color
		| null
		| ((rowIndex: number, node: LayoutPdfNode, columnIndex: number) => Color | null | undefined);
	fillOpacity?:
		number | ((rowIndex: number, node: LayoutPdfNode, columnIndex: number) => number | undefined);
}

export interface TableProcessorState {
	tableNode: LayoutPdfNode;
	layout: ResolvedTableLayout;
	rowSpanData: RowSpanData[];
	borderRadius: number;
	roundedTopByPage: Map<number, number>;
	vectorRegistryByPage: Map<PdfPage, TablePageVectorRegistry>;
}
