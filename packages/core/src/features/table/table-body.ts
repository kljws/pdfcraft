import type { PreprocessedPdfNode } from "../../types/internal";
import { isEmptyObject, isObject, isPositiveInteger, isValue } from "../../utils/variable-type";

const isSpanPlaceholder = (value: unknown): boolean =>
	(isObject(value) && (value._span === true || isEmptyObject(value))) ||
	value === "" ||
	!isValue(value);

const getCellSpan = (cell: unknown): number =>
	isObject(cell) && isPositiveInteger(cell.colSpan) ? cell.colSpan : 1;

export function normalizeTableBody(body: PreprocessedPdfNode[][]): number {
	const columnCount = body[0].length;
	if (columnCount === 0) {
		throw new Error("Invalid table node: table rows must contain at least one cell");
	}

	let activeRowSpans = Array<number>(columnCount).fill(0);
	for (let rowIndex = 0; rowIndex < body.length; rowIndex++) {
		const sourceRow = body[rowIndex];
		const normalizedRow: PreprocessedPdfNode[] = [];
		let sourceIndex = 0;
		const usesExplicitSlots = sourceRow.length === columnCount;
		if (sourceRow.length > columnCount) {
			throw new Error(
				`Invalid table row ${rowIndex}: resolves to more than ${columnCount} columns`,
			);
		}

		for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
			if (activeRowSpans[columnIndex] > 0) {
				if (usesExplicitSlots || isSpanPlaceholder(sourceRow[sourceIndex])) sourceIndex++;
				normalizedRow.push({ _span: true } as unknown as PreprocessedPdfNode);
				continue;
			}

			if (sourceIndex >= sourceRow.length) {
				throw new Error(
					`Invalid table row ${rowIndex}: resolves to fewer than ${columnCount} columns`,
				);
			}
			const cell = sourceRow[sourceIndex++];
			if (isObject(cell) && cell._span === true) {
				throw new Error(
					`Invalid table cell at row ${rowIndex}, column ${columnIndex}: span placeholder has no active span`,
				);
			}
			const colSpan = getCellSpan(cell);
			if (columnIndex + colSpan > columnCount) {
				throw new Error(
					`Invalid table cell at row ${rowIndex}, column ${columnIndex}: 'colSpan' exceeds the table's ${columnCount} columns`,
				);
			}
			for (let spanIndex = 0; spanIndex < colSpan; spanIndex++) {
				if (activeRowSpans[columnIndex + spanIndex] > 0) {
					throw new Error(
						`Invalid table cell at row ${rowIndex}, column ${columnIndex}: 'colSpan' overlaps an active rowSpan`,
					);
				}
			}

			normalizedRow.push(cell);
			for (let spanIndex = 1; spanIndex < colSpan; spanIndex++) {
				if (usesExplicitSlots || isSpanPlaceholder(sourceRow[sourceIndex])) sourceIndex++;
				normalizedRow.push({ _span: true } as unknown as PreprocessedPdfNode);
				columnIndex++;
			}
		}

		if (sourceIndex < sourceRow.length) {
			throw new Error(
				`Invalid table row ${rowIndex}: resolves to more than ${columnCount} columns`,
			);
		}

		const nextRowSpans = activeRowSpans.map((remaining) => Math.max(0, remaining - 1));
		for (let columnIndex = 0; columnIndex < normalizedRow.length; columnIndex++) {
			const cell = normalizedRow[columnIndex];
			if (!isObject(cell) || cell._span || !isPositiveInteger(cell.rowSpan)) continue;
			if (rowIndex + cell.rowSpan > body.length) {
				throw new Error(
					`Invalid table cell at row ${rowIndex}, column ${columnIndex}: 'rowSpan' exceeds the table's ${body.length} rows`,
				);
			}
			const colSpan = getCellSpan(cell);
			for (let spanIndex = 0; spanIndex < colSpan; spanIndex++) {
				nextRowSpans[columnIndex + spanIndex] = Math.max(
					nextRowSpans[columnIndex + spanIndex],
					cell.rowSpan - 1,
				);
			}
		}

		body[rowIndex] = normalizedRow;
		activeRowSpans = nextRowSpans;
	}

	return columnCount;
}
