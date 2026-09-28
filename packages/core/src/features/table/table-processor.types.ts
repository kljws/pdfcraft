import type { Color } from "../../types";
import type { Vector, VectorPageItem } from "../../types/internal";
import type { LayoutTableCell } from "./table.types";

export type TablePageVectorRegistry = {
	horizontalGroup?: object | undefined;
	horizontalItems: Set<VectorPageItem>;
	leftVerticals: Set<VectorPageItem>;
	rightVerticals: Set<VectorPageItem>;
	leftFillGroup?: object | undefined;
	leftFills: Set<VectorPageItem>;
	rightFillGroup?: object | undefined;
	rightFills: Set<VectorPageItem>;
};

export type RowSpanData = {
	left: number;
	rowSpan: number;
	width?: number | undefined;
};

export type ResolvedTableLayout = {
	defaultBorder: boolean;
	hLineWhenBroken?: boolean | undefined;
	hLineWidth(index: number, node: LayoutTableCell): number;
	vLineWidth(index: number, node: LayoutTableCell): number;
	hLineStyle(
		index: number,
		node: LayoutTableCell,
	): { dash?: Vector["dash"] | undefined } | null | undefined;
	vLineStyle(
		index: number,
		node: LayoutTableCell,
	): { dash?: Vector["dash"] | undefined } | null | undefined;
	hLineColor: Color | ((index: number, node: LayoutTableCell, columnIndex?: number) => Color);
	vLineColor: Color | ((index: number, node: LayoutTableCell, rowIndex?: number) => Color);
	paddingLeft(index: number, node: LayoutTableCell): number;
	paddingRight(index: number, node: LayoutTableCell): number;
	paddingTop(index: number, node: LayoutTableCell): number;
	paddingBottom(index: number, node: LayoutTableCell): number;
	fillColor?:
		| Color
		| null
		| ((rowIndex: number, node: LayoutTableCell, columnIndex: number) => Color | null | undefined)
		| undefined;
	fillOpacity?:
		| number
		| ((rowIndex: number, node: LayoutTableCell, columnIndex: number) => number | undefined)
		| undefined;
};
