import type PageElementWriter from "./element-writer.page";
import { isNumber } from "../utils/variable-type";
import type { TableProcessorState } from "./table-processor.types";
import { createRoundedRectanglePath, type CornerRadii } from "./table-processor.helpers";

const TABLE_FILL_CORRECTION = 0.5;

export interface TableLinePosition {
	x: number;
	index: number;
}

export interface TableRowRenderState extends TableProcessorState {
	dontBreakRows: boolean;
	bottomLineWidth: number;
	rowPaddingTop: number;
	rowPaddingBottom: number;
	topLineWidth: number;
	reservedAtBottom: number;
	rowTopPageY: number;
	drawVerticalLine(
		x: number,
		y0: number,
		y1: number,
		vLineColIndex: number,
		writer: PageElementWriter,
		vLineRowIndex: number,
		beforeVLineColIndex: number | null,
		trim?: { top: number; bottom: number },
	): void;
}

interface RowSegment {
	y1: number;
	y2: number;
	willBreak: boolean;
	horizontalLineOffset: number;
	roundTop?: boolean;
	roundBottom?: boolean;
}

export function drawTableRowSegment(
	processor: TableRowRenderState,
	rowIndex: number,
	writer: PageElementWriter,
	xs: TableLinePosition[],
	segment: RowSegment,
): void {
	const body = processor.tableNode.table!.body;
	const {
		y1,
		y2,
		willBreak,
		horizontalLineOffset,
		roundTop = false,
		roundBottom = false,
	} = segment;
	let lastCellIndex = -1;
	for (let i = 0; i < xs.length - 1; i++) {
		lastCellIndex = Math.max(lastCellIndex, xs[i].index);
	}

	for (let i = 0, l = xs.length; i < l; i++) {
		let leftCellBorder = false;
		let rightCellBorder = false;
		const colIndex = xs[i].index;

		if (colIndex < body[rowIndex].length) {
			const cell = body[rowIndex][colIndex];
			leftCellBorder = cell.border ? cell.border[0] : processor.layout.defaultBorder;
			rightCellBorder = cell.border ? cell.border[2] : processor.layout.defaultBorder;
		}
		if (colIndex > 0 && !leftCellBorder) {
			const cell = body[rowIndex][colIndex - 1];
			leftCellBorder = cell.border ? cell.border[2] : processor.layout.defaultBorder;
		}
		if (colIndex + 1 < body[rowIndex].length && !rightCellBorder) {
			const cell = body[rowIndex][colIndex + 1];
			rightCellBorder = cell.border ? cell.border[0] : processor.layout.defaultBorder;
		}

		if (leftCellBorder) {
			const isOuterBoundary = i === 0 || i === l - 1;
			const edgeCell = i === 0 ? body[rowIndex][0] : body[rowIndex][xs[i - 1]?.index ?? colIndex];
			const hasTopBorder = edgeCell.border ? edgeCell.border[1] : processor.layout.defaultBorder;
			const hasBottomBorder = edgeCell.border ? edgeCell.border[3] : processor.layout.defaultBorder;
			processor.drawVerticalLine(
				xs[i].x,
				y1 - horizontalLineOffset,
				y2 + processor.bottomLineWidth,
				xs[i].index,
				writer,
				rowIndex,
				xs[i - 1]?.index ?? null,
				isOuterBoundary
					? {
							top:
								roundTop && processor.topLineWidth > 0 && hasTopBorder
									? processor.borderRadius + processor.topLineWidth / 2
									: 0,
							bottom:
								roundBottom && processor.bottomLineWidth > 0 && hasBottomBorder
									? processor.borderRadius + processor.bottomLineWidth / 2
									: 0,
						}
					: undefined,
			);
		}

		if (i >= l - 1) continue;
		const cell = body[rowIndex][colIndex];
		cell._willBreak ??= willBreak;
		if (cell._bottomY === undefined) {
			let bottomY = processor.dontBreakRows
				? y2 + processor.bottomLineWidth
				: y2 + processor.bottomLineWidth / 2;
			if (willBreak || processor.dontBreakRows) bottomY -= processor.rowPaddingBottom;
			cell._bottomY = bottomY - processor.reservedAtBottom;
		}
		cell._rowTopPageY = processor.rowTopPageY;
		if (processor.dontBreakRows) cell._rowTopPageYPadding = processor.rowPaddingTop;
		cell._lastPageNumber = writer.context().page + 1;

		let fillColor = cell.fillColor;
		let fillOpacity = cell.fillOpacity;
		if (!fillColor) {
			fillColor =
				typeof processor.layout.fillColor === "function"
					? (processor.layout.fillColor(rowIndex, processor.tableNode, colIndex) ?? undefined)
					: (processor.layout.fillColor ?? undefined);
		}
		if (!isNumber(fillOpacity)) {
			fillOpacity =
				typeof processor.layout.fillOpacity === "function"
					? processor.layout.fillOpacity(rowIndex, processor.tableNode, colIndex)
					: processor.layout.fillOpacity;
		}
		const overlayPattern = cell.overlayPattern;
		if (!fillColor && !overlayPattern) continue;

		const leftBorderWidth = leftCellBorder
			? processor.layout.vLineWidth(colIndex, processor.tableNode)
			: 0;
		let rightBorderWidth = 0;
		if ((colIndex === 0 || colIndex + 1 === body[rowIndex].length) && !rightCellBorder) {
			rightBorderWidth = processor.layout.vLineWidth(colIndex + 1, processor.tableNode);
		} else if (rightCellBorder) {
			rightBorderWidth = processor.layout.vLineWidth(colIndex + 1, processor.tableNode) / 2;
		}

		const x1 = processor.dontBreakRows ? xs[i].x + leftBorderWidth : xs[i].x + leftBorderWidth / 2;
		const fillY1 = processor.dontBreakRows ? y1 : y1 - horizontalLineOffset / 2;
		const x2 = xs[i + 1].x + rightBorderWidth;
		const fillY2 = processor.dontBreakRows
			? y2 + processor.bottomLineWidth
			: y2 + processor.bottomLineWidth / 2;
		const isFirstCell = colIndex === 0;
		const isLastCell = colIndex === lastCellIndex;
		const horizontalCorrection =
			lastCellIndex === 0
				? 0
				: isFirstCell || isLastCell
					? TABLE_FILL_CORRECTION
					: TABLE_FILL_CORRECTION * 2;
		const rectangle = {
			type: "rect" as const,
			x: x1 - (isFirstCell ? 0 : TABLE_FILL_CORRECTION),
			y: fillY1 - TABLE_FILL_CORRECTION,
			w: x2 - x1 + horizontalCorrection,
			h: fillY2 - fillY1 + TABLE_FILL_CORRECTION * 2,
			lineWidth: 0,
		};
		const cornerRadii: CornerRadii = [
			roundTop && isFirstCell ? processor.borderRadius : 0,
			roundTop && isLastCell ? processor.borderRadius : 0,
			roundBottom && isLastCell ? processor.borderRadius : 0,
			roundBottom && isFirstCell ? processor.borderRadius : 0,
		];
		const hasRoundedCorner = cornerRadii.some((radius) => radius > 0);
		const shape = hasRoundedCorner
			? {
					type: "path" as const,
					x: rectangle.x,
					y: rectangle.y,
					d: createRoundedRectanglePath(rectangle.w, rectangle.h, cornerRadii),
					lineWidth: 0,
				}
			: rectangle;
		if (fillColor) {
			writer.addVector(
				{
					...shape,
					color: fillColor,
					fillOpacity,
					_isFillColorFromUnbreakable: Boolean(writer.transactionLevel),
				},
				false,
				true,
				writer.context().backgroundLength[writer.context().page],
			);
		}
		if (overlayPattern) {
			writer.addVector(
				{
					...shape,
					color: overlayPattern,
					fillOpacity: cell.overlayOpacity,
				},
				false,
				true,
			);
		}
	}
}
