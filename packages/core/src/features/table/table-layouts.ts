/* oxlint-disable no-unused-vars */

import type { Dictionary } from "../../types";
import type { PdfNode } from "../../types/internal";
import type { PdfTable, TableLayout } from "./table.types";

export { tableLayouts, defaultTableLayout };

/** The part of a normalized table node that the layout presets read. */
export type PresetTableNode = { table: Pick<PdfTable, "widths" | "body" | "headerRows"> };

const tableLayouts = {
	noBorders: {
		hLineWidth(i: number): number {
			return 0;
		},
		vLineWidth(i: number): number {
			return 0;
		},
		paddingLeft(i: number): number {
			return (i && 4) || 0;
		},
		paddingRight(i: number, node: PresetTableNode): number {
			return i < node.table.widths.length - 1 ? 4 : 0;
		},
	},
	headerLineOnly: {
		hLineWidth(i: number, node: PresetTableNode): number {
			if (i === 0 || i === node.table.body.length) {
				return 0;
			}
			return i === node.table.headerRows ? 2 : 0;
		},
		vLineWidth(i: number): number {
			return 0;
		},
		paddingLeft(i: number): number {
			return i === 0 ? 0 : 8;
		},
		paddingRight(i: number, node: PresetTableNode): number {
			return i === node.table.widths.length - 1 ? 0 : 8;
		},
	},
	lightHorizontalLines: {
		hLineWidth(i: number, node: PresetTableNode): number {
			if (i === 0 || i === node.table.body.length) {
				return 0;
			}
			return i === node.table.headerRows ? 2 : 1;
		},
		vLineWidth(i: number): number {
			return 0;
		},
		hLineColor(i: number): string {
			return i === 1 ? "black" : "#aaa";
		},
		paddingLeft(i: number): number {
			return i === 0 ? 0 : 8;
		},
		paddingRight(i: number, node: PresetTableNode): number {
			return i === node.table.widths.length - 1 ? 0 : 8;
		},
	},
} satisfies Dictionary<Partial<TableLayout<PresetTableNode>>>;

const defaultTableLayout = {
	hLineWidth(i: number, node: PdfNode): number {
		return 1;
	},
	vLineWidth(i: number, node: PdfNode): number {
		return 1;
	},
	hLineColor(i: number, node: PdfNode): string {
		return "black";
	},
	vLineColor(i: number, node: PdfNode): string {
		return "black";
	},
	hLineStyle(i: number, node: PdfNode): null {
		return null;
	},
	vLineStyle(i: number, node: PdfNode): null {
		return null;
	},
	paddingLeft(i: number, node: PdfNode): number {
		return 4;
	},
	paddingRight(i: number, node: PdfNode): number {
		return 4;
	},
	paddingTop(i: number, node: PdfNode): number {
		return 2;
	},
	paddingBottom(i: number, node: PdfNode): number {
		return 2;
	},
	fillColor(i: number, node: PdfNode): null {
		return null;
	},
	fillOpacity(i: number, node: PdfNode): number {
		return 1;
	},
	defaultBorder: true,
} satisfies TableLayout;
