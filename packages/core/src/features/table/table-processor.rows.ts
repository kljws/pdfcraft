import type PageElementWriter from "../../layout/element-writer.page";
import { isNumber } from "../../utils/variable-type";
import type TableProcessor from "./table-processor";
import {
	createRoundedRectanglePath,
	requireTable,
	trackTableVector,
	type CornerRadii,
	type TableVectorRole,
} from "./table-processor.helpers";

const tableFillCorrection = 0.5;

export type TableLinePosition = {
	x: number;
	index: number;
};

type RowSegment = {
	y1: number;
	y2: number;
	willBreak: boolean;
	horizontalLineOffset: number;
	roundTop?: boolean | undefined;
	roundBottom?: boolean | undefined;
};

export function drawTableRowSegment(
	processor: TableProcessor,
	rowIndex: number,
	writer: PageElementWriter,
	xs: TableLinePosition[],
	segment: RowSegment,
): void {
	const body = requireTable(processor.tableNode).body;
	const {
		y1,
		y2,
		willBreak,
		horizontalLineOffset,
		roundTop = false,
		roundBottom = false,
	} = segment;
	const row = body[rowIndex];
	if (!row) throw new Error(`Internal layout error: missing table row ${rowIndex}`);
	let lastCellIndex = -1;
	for (const position of xs.slice(0, -1)) {
		lastCellIndex = Math.max(lastCellIndex, position.index);
	}

	const l = xs.length;
	for (const [i, position] of xs.entries()) {
		let leftCellBorder = false;
		let rightCellBorder = false;
		const colIndex = position.index;

		const ownCell = row[colIndex];
		if (ownCell) {
			leftCellBorder = ownCell.border ? ownCell.border[0] : processor.layout.defaultBorder;
			rightCellBorder = ownCell.border ? ownCell.border[2] : processor.layout.defaultBorder;
		}
		const previousCell = colIndex > 0 ? row[colIndex - 1] : undefined;
		if (previousCell && !leftCellBorder) {
			leftCellBorder = previousCell.border
				? previousCell.border[2]
				: processor.layout.defaultBorder;
		}
		const nextCell = row[colIndex + 1];
		if (nextCell && !rightCellBorder) {
			rightCellBorder = nextCell.border ? nextCell.border[0] : processor.layout.defaultBorder;
		}

		if (leftCellBorder) {
			const isOuterBoundary = i === 0 || i === l - 1;
			const edgeCell = i === 0 ? row[0] : row[xs[i - 1]?.index ?? colIndex];
			const hasTopBorder = edgeCell?.border ? edgeCell.border[1] : processor.layout.defaultBorder;
			const hasBottomBorder = edgeCell?.border
				? edgeCell.border[3]
				: processor.layout.defaultBorder;
			processor.drawVerticalLine(
				position.x,
				y1 - horizontalLineOffset,
				y2 + processor.bottomLineWidth,
				position.index,
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

		const nextPosition = xs[i + 1];
		const cell = row[colIndex];
		if (!nextPosition || !cell) continue;
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
		if ((colIndex === 0 || colIndex + 1 === row.length) && !rightCellBorder) {
			rightBorderWidth = processor.layout.vLineWidth(colIndex + 1, processor.tableNode);
		} else if (rightCellBorder) {
			rightBorderWidth = processor.layout.vLineWidth(colIndex + 1, processor.tableNode) / 2;
		}

		const x1 = processor.dontBreakRows
			? position.x + leftBorderWidth
			: position.x + leftBorderWidth / 2;
		const fillY1 = processor.dontBreakRows ? y1 : y1 - horizontalLineOffset / 2;
		const x2 = nextPosition.x + rightBorderWidth;
		const fillY2 = processor.dontBreakRows
			? y2 + processor.bottomLineWidth
			: y2 + processor.bottomLineWidth / 2;
		const isFirstCell = colIndex === 0;
		const isLastCell = colIndex === lastCellIndex;
		const horizontalCorrection =
			lastCellIndex === 0
				? 0
				: isFirstCell || isLastCell
					? tableFillCorrection
					: tableFillCorrection * 2;
		const rectangle = {
			type: "rect" as const,
			x: x1 - (isFirstCell ? 0 : tableFillCorrection),
			y: fillY1 - tableFillCorrection,
			w: x2 - x1 + horizontalCorrection,
			h: fillY2 - fillY1 + tableFillCorrection * 2,
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
		const fillRoles: TableVectorRole[] = [];
		const fillGroup = {};
		if (!hasRoundedCorner && processor.borderRadius > 0) {
			if (isFirstCell) fillRoles.push("leftFill");
			if (isLastCell) fillRoles.push("rightFill");
		}
		if (fillColor) {
			const vector = {
				...shape,
				color: fillColor,
				fillOpacity,
				_isFillColorFromUnbreakable: Boolean(writer.transactionLevel),
			};
			if (fillRoles.length > 0) trackTableVector(processor, vector, fillRoles, fillGroup);
			writer.addVector(
				vector,
				false,
				true,
				writer.context().backgroundLength[writer.context().page],
			);
		}
		if (overlayPattern) {
			const vector = {
				...shape,
				color: overlayPattern,
				fillOpacity: cell.overlayOpacity,
			};
			if (fillRoles.length > 0) trackTableVector(processor, vector, fillRoles, fillGroup);
			writer.addVector(vector, false, true);
		}
	}
}
