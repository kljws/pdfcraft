import type { Color } from "../../types";
import type { PdfPage, Vector, VectorPageItem } from "../../types/internal";
import type { LayoutTableCell, LayoutTableNode } from "./table.types";

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
	hLineWidth(index: number, node: LayoutTableCell): number;
	vLineWidth(index: number, node: LayoutTableCell): number;
	hLineStyle(index: number, node: LayoutTableCell): { dash?: Vector["dash"] } | null | undefined;
	vLineStyle(index: number, node: LayoutTableCell): { dash?: Vector["dash"] } | null | undefined;
	hLineColor: Color | ((index: number, node: LayoutTableCell, columnIndex?: number) => Color);
	vLineColor: Color | ((index: number, node: LayoutTableCell, rowIndex?: number) => Color);
	paddingLeft(index: number, node: LayoutTableCell): number;
	paddingRight(index: number, node: LayoutTableCell): number;
	paddingTop(index: number, node: LayoutTableCell): number;
	paddingBottom(index: number, node: LayoutTableCell): number;
	fillColor?:
		| Color
		| null
		| ((rowIndex: number, node: LayoutTableCell, columnIndex: number) => Color | null | undefined);
	fillOpacity?:
		| number
		| ((rowIndex: number, node: LayoutTableCell, columnIndex: number) => number | undefined);
}

export interface TableProcessorState {
	tableNode: LayoutTableNode;
	layout: ResolvedTableLayout;
	rowSpanData: RowSpanData[];
	borderRadius: number;
	roundedTopByPage: Map<number, number>;
	vectorRegistryByPage: Map<PdfPage, TablePageVectorRegistry>;
}
