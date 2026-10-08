import { isString } from "../utils/variable-type";
import type { ColumnWidth } from "../types/internal";

/**
 * Resolves `_calcWidth` for every column. A percentage width is a share of
 * `availableWidth + offsetTotal`, less the width its container reserves for that column
 * (`reservedWidths[index]`, for example a table cell's padding and borders).
 */
function buildColumnWidths(
	columns: ColumnWidth[],
	availableWidth: number,
	offsetTotal = 0,
	reservedWidths: readonly number[] = [],
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
		if (isPercentageColumn(col)) {
			const totalAvailableWidth = initialAvailableWidth + offsetTotal;
			resolvedWidth =
				(parseFloat(String(col.width)) * totalAvailableWidth) / 100 -
				(reservedWidths[colIndex] ?? 0);
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
	const minW = autoMin + starMaxMin * starColumns.length;
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
			const W = availableWidth - minW;
			const D = autoMax - autoMin;

			autoColumns.forEach((col) => {
				const d = col._maxWidth - col._minWidth;
				col._calcWidth = col._minWidth + (D > 0 ? (d * W) / D : 0);
				availableWidth -= col._calcWidth;
			});
		}

		if (starColumns.length > 0) {
			const starSize = availableWidth / starColumns.length;

			starColumns.forEach((col) => {
				col._calcWidth = starSize;
			});
		}
	}
}

function isPercentageColumn(column: ColumnWidth): boolean {
	return isString(column.width) && /\d+%/.test(column.width);
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
	const result = { min: 0, max: 0 };
	const maxStar = { min: 0, max: 0 };
	let starCount = 0;

	for (const c of columns) {
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
	isPercentageColumn: isPercentageColumn,
	isAutoColumn: isAutoColumn,
	isStarColumn: isStarColumn,
};
