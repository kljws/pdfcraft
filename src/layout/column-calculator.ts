import { isString } from "../utils/variable-type";
import type { ColumnWidth, TableLayout } from "../types/internal";

type TableWidthNode<Node extends object> = Node & { _layout?: TableLayout<Node> };

function buildColumnWidths<Node extends object>(
	columns: ColumnWidth[],
	availableWidth: number,
	offsetTotal = 0,
	tableNode?: TableWidthNode<Node>,
): void {
	const autoColumns: ColumnWidth[] = [];
	let autoMin = 0;
	let autoMax = 0;
	const starColumns: ColumnWidth[] = [];
	let starMaxMin = 0;
	const fixedColumns: Array<{ column: ColumnWidth; index: number }> = [];
	const initialAvailableWidth = availableWidth;

	columns.forEach((column, index) => {
		if (isAutoColumn(column)) {
			autoColumns.push(column);
			autoMin += column._minWidth;
			autoMax += column._maxWidth;
		} else if (isStarColumn(column)) {
			starColumns.push(column);
			starMaxMin = Math.max(starMaxMin, column._minWidth);
		} else {
			fixedColumns.push({ column, index });
		}
	});

	fixedColumns.forEach(({ column: col, index: colIndex }) => {
		let resolvedWidth = col.width;
		// width specified as %
		if (isString(col.width) && /\d+%/.test(col.width)) {
			// In tables we have to take into consideration the reserved width for paddings and borders
			let reservedWidth = 0;
			if (tableNode) {
				const layout = tableNode._layout;
				if (!layout) throw new Error("Internal layout error: table layout was not resolved");
				const paddingLeft = layout.paddingLeft(colIndex, tableNode);
				const paddingRight = layout.paddingRight(colIndex, tableNode);
				const borderLeft = layout.vLineWidth(colIndex, tableNode);
				const borderRight = layout.vLineWidth(colIndex + 1, tableNode);
				if (colIndex === 0) {
					// first column assumes whole borderLeft and half of border right
					reservedWidth = paddingLeft + paddingRight + borderLeft + borderRight / 2;
				} else if (colIndex === columns.length - 1) {
					// last column assumes whole borderRight and half of border left
					reservedWidth = paddingLeft + paddingRight + borderLeft / 2 + borderRight;
				} else {
					// Columns in the middle assume half of each border
					reservedWidth = paddingLeft + paddingRight + borderLeft / 2 + borderRight / 2;
				}
			}
			const totalAvailableWidth = initialAvailableWidth + offsetTotal;
			resolvedWidth = (parseFloat(col.width) * totalAvailableWidth) / 100 - reservedWidth;
		}
		const fixedWidth = typeof resolvedWidth === "number" ? resolvedWidth : col._minWidth;
		if (fixedWidth < col._minWidth && col.elasticWidth) {
			col._calcWidth = col._minWidth;
		} else {
			col._calcWidth = fixedWidth;
		}

		availableWidth -= col._calcWidth;
	});

	// http://www.freesoft.org/CIE/RFC/1942/18.htm
	// http://www.w3.org/TR/CSS2/tables.html#width-layout
	// http://dev.w3.org/csswg/css3-tables-algorithms/Overview.src.htm
	let minW = autoMin + starMaxMin * starColumns.length;
	if (minW >= availableWidth) {
		// Text layout can hard-wrap long tokens. Keep flexible columns inside the
		// available page width when their measured word widths cannot all fit.
		const scale = minW > 0 ? Math.max(0, availableWidth) / minW : 0;
		autoColumns.forEach((col) => {
			col._calcWidth = col._minWidth * scale;
		});

		starColumns.forEach((col) => {
			col._calcWidth = starMaxMin * scale;
		});
	} else {
		const autoMaxWithMinimumStars = autoMax + starMaxMin * starColumns.length;
		if (autoMaxWithMinimumStars <= availableWidth) {
			// Auto columns get their natural width before star columns receive the remainder.
			autoColumns.forEach((col) => {
				col._calcWidth = col._maxWidth;
				availableWidth -= col._calcWidth;
			});
		} else {
			// Auto columns must interpolate, while reserving the minimum star widths.
			let W = availableWidth - minW;
			let D = autoMax - autoMin;

			autoColumns.forEach((col) => {
				let d = col._maxWidth - col._minWidth;
				col._calcWidth = col._minWidth + (D > 0 ? (d * W) / D : 0);
				availableWidth -= col._calcWidth;
			});
		}

		if (starColumns.length > 0) {
			let starSize = availableWidth / starColumns.length;

			starColumns.forEach((col) => {
				col._calcWidth = starSize;
			});
		}
	}
}

function isAutoColumn(column: ColumnWidth): boolean {
	return column.width === "auto";
}

function isStarColumn(column: ColumnWidth): boolean {
	return (
		column.width === null ||
		column.width === undefined ||
		column.width === "*" ||
		column.width === "star"
	);
}

function measureMinMax(columns: ColumnWidth[]): { min: number; max: number } {
	let result = { min: 0, max: 0 };
	let maxStar = { min: 0, max: 0 };
	let starCount = 0;

	for (let i = 0, l = columns.length; i < l; i++) {
		let c = columns[i];

		if (isStarColumn(c)) {
			maxStar.min = Math.max(maxStar.min, c._minWidth);
			maxStar.max = Math.max(maxStar.max, c._maxWidth);
			starCount++;
		} else if (isAutoColumn(c)) {
			result.min += c._minWidth;
			result.max += c._maxWidth;
		} else {
			const width = typeof c.width === "number" ? c.width : undefined;
			result.min += width || c._minWidth;
			result.max += width || c._maxWidth;
		}
	}

	if (starCount) {
		result.min += starCount * maxStar.min;
		result.max += starCount * maxStar.max;
	}

	return result;
}

/**
 * Calculates column widths
 */
export default {
	buildColumnWidths: buildColumnWidths,
	measureMinMax: measureMinMax,
	isAutoColumn: isAutoColumn,
	isStarColumn: isStarColumn,
};
