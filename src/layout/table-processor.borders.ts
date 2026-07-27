import { isNumber } from "../utils/variable-type";
import type { Color } from "../types";
import type { Vector } from "../types/internal";
import type PageElementWriter from "./element-writer.page";
import type { TableProcessorState } from "./table-processor.types";
import { createRoundedRectanglePath } from "./table-processor.helpers";

const removeExistingPageBottomLines = (
	writer: PageElementWriter,
	pageIndex: number,
	bottomY: number,
	tableLeft: number,
	tableRight: number,
): void => {
	const page = writer.context().pages[pageIndex];
	if (!page) return;
	for (let index = page.items.length - 1; index >= 0; index--) {
		const entry = page.items[index];
		if (entry.type !== "vector" || entry.item.type !== "line") continue;
		const vector = entry.item;
		const lineWidth = vector.lineWidth ?? 1;
		const isHorizontal = Math.abs((vector.y1 ?? 0) - (vector.y2 ?? 0)) < 0.001;
		const isAtBoundary = Math.abs((vector.y1 ?? 0) - bottomY) <= lineWidth + 1;
		const left = Math.min(vector.x1 ?? 0, vector.x2 ?? 0);
		const right = Math.max(vector.x1 ?? 0, vector.x2 ?? 0);
		const belongsToTable = left >= tableLeft - 1 && right <= tableRight + 1;
		if (isHorizontal && isAtBoundary && belongsToTable) page.items.splice(index, 1);
	}
};

const roundExistingPageBottom = (
	writer: PageElementWriter,
	pageIndex: number,
	bottomY: number,
	radius: number,
	tableLeft: number,
	tableRight: number,
): void => {
	const page = writer.context().pages[pageIndex];
	if (!page) return;
	const verticals: Vector[] = [];
	for (const entry of page.items) {
		if (
			entry.type === "vector" &&
			entry.item.type === "line" &&
			Math.abs((entry.item.x1 ?? 0) - (entry.item.x2 ?? 0)) < 0.001 &&
			(Math.abs((entry.item.x1 ?? 0) - tableLeft) < 0.001 ||
				Math.abs((entry.item.x1 ?? 0) - tableRight) < 0.001) &&
			Math.abs((entry.item.y2 ?? 0) - bottomY) <= (entry.item.lineWidth ?? 1) + 1
		) {
			verticals.push(entry.item);
		}
	}
	for (const vector of verticals) {
		vector.y2 = Math.min(vector.y2 ?? bottomY, bottomY - radius);
	}

	const fills: Vector[] = [];
	for (const entry of page.items) {
		if (
			entry.type === "vector" &&
			entry.item.type === "rect" &&
			entry.item.color !== undefined &&
			(entry.item.lineWidth ?? 0) === 0 &&
			(entry.item.x ?? 0) + (entry.item.w ?? 0) >= tableLeft - 1 &&
			(entry.item.x ?? 0) <= tableRight + 1 &&
			Math.abs((entry.item.y ?? 0) + (entry.item.h ?? 0) - bottomY) <= 2
		) {
			fills.push(entry.item);
		}
	}
	if (fills.length === 0) return;
	const left = fills.reduce((current, vector) =>
		(vector.x ?? 0) < (current.x ?? 0) ? vector : current,
	);
	const right = fills.reduce((current, vector) =>
		(vector.x ?? 0) + (vector.w ?? 0) > (current.x ?? 0) + (current.w ?? 0) ? vector : current,
	);
	for (const vector of new Set([left, right])) {
		const width = vector.w ?? 0;
		const height = vector.h ?? 0;
		vector.type = "path";
		vector.d = createRoundedRectanglePath(width, height, [
			0,
			0,
			vector === right ? radius : 0,
			vector === left ? radius : 0,
		]);
	}
};

const hasCellBorder = (
	cell: { border?: [boolean, boolean, boolean, boolean] } | undefined,
	side: 0 | 1 | 2 | 3,
	defaultBorder: boolean,
): boolean => (cell?.border ? cell.border[side] : defaultBorder);

const getHorizontalBorderColor = (
	processor: TableProcessorState,
	cell: { borderColor?: [Color, Color, Color, Color] } | undefined,
	side: 1 | 3,
	lineIndex: number,
	columnIndex: number,
): Color => {
	if (cell?.borderColor?.[side] !== undefined) return cell.borderColor[side];
	return typeof processor.layout.hLineColor === "function"
		? processor.layout.hLineColor(lineIndex, processor.tableNode, columnIndex)
		: processor.layout.hLineColor;
};

const addRoundedCorner = (
	processor: TableProcessorState,
	writer: PageElementWriter,
	corner: "topLeft" | "topRight" | "bottomRight" | "bottomLeft",
	x: number,
	y: number,
	radius: number,
	lineWidth: number,
	lineColor: Color,
	dash: { length: number; space?: number; phase?: number } | undefined,
	ignoreContextY: boolean,
	forcePage: number | undefined,
): void => {
	const paths = {
		topLeft: `M 0 ${radius} Q 0 0 ${radius} 0`,
		topRight: `M 0 0 Q ${radius} 0 ${radius} ${radius}`,
		bottomRight: `M ${radius} 0 Q ${radius} ${radius} 0 ${radius}`,
		bottomLeft: `M ${radius} ${radius} Q 0 ${radius} 0 0`,
	};
	writer.addVector(
		{
			type: "path",
			x,
			y,
			d: paths[corner],
			lineWidth,
			lineColor,
			dash,
			lineJoin: "round",
		},
		false,
		ignoreContextY,
		undefined,
		forcePage,
	);
};

export function drawHorizontalLine(
	processor: TableProcessorState,
	lineIndex: number,
	writer: PageElementWriter,
	overrideY?: number,
	moveDown: boolean = true,
	forcePage?: number,
	styleLineIndex = lineIndex,
	borderSide: "both" | "top" | "bottom" = "both",
): void {
	let lineWidth = processor.layout.hLineWidth(styleLineIndex, processor.tableNode);
	if (lineWidth) {
		let style = processor.layout.hLineStyle(styleLineIndex, processor.tableNode);
		let dash;
		if (style && style.dash) {
			dash = style.dash;
		}

		let offset = lineWidth / 2;
		let currentLine: { left: number; width: number } | null = null;
		let body = processor.tableNode.table!.body;
		const isTopRoundedEdge =
			processor.borderRadius > 0 &&
			(borderSide === "top" || (borderSide === "both" && lineIndex === 0));
		const isBottomRoundedEdge =
			processor.borderRadius > 0 &&
			(borderSide === "bottom" || (borderSide === "both" && lineIndex === body.length));
		const isRoundedEdge = isTopRoundedEdge || isBottomRoundedEdge;
		const boundaryColumn = processor.rowSpanData.length - 1;
		const tableLeft = processor.rowSpanData[0]?.left ?? 0;
		const tableRight = processor.rowSpanData[boundaryColumn]?.left ?? tableLeft;
		const leftLineWidth = processor.layout.vLineWidth(0, processor.tableNode);
		const rightLineWidth = processor.layout.vLineWidth(boundaryColumn, processor.tableNode);
		const leftCenter = tableLeft + leftLineWidth / 2;
		const rightCenter = tableRight + rightLineWidth / 2;
		const edgeRowIndex = isTopRoundedEdge
			? Math.min(body.length - 1, Math.max(0, lineIndex))
			: Math.min(body.length - 1, Math.max(0, lineIndex - 1));
		const edgeRow = body[edgeRowIndex];
		const horizontalSide = isTopRoundedEdge ? 1 : 3;
		const leftCornerCell = edgeRow?.[0];
		const rightCornerCell = edgeRow?.[Math.max(0, boundaryColumn - 1)];
		const roundLeft =
			isRoundedEdge &&
			leftLineWidth > 0 &&
			hasCellBorder(leftCornerCell, horizontalSide, processor.layout.defaultBorder) &&
			hasCellBorder(leftCornerCell, 0, processor.layout.defaultBorder);
		const roundRight =
			isRoundedEdge &&
			rightLineWidth > 0 &&
			hasCellBorder(rightCornerCell, horizontalSide, processor.layout.defaultBorder) &&
			hasCellBorder(rightCornerCell, 2, processor.layout.defaultBorder);
		if (isBottomRoundedEdge && borderSide === "bottom") {
			const y = (overrideY || 0) + offset;
			const pageIndex = forcePage ?? writer.context().page;
			const absoluteY = isNumber(overrideY) ? y : writer.context().y + y;
			removeExistingPageBottomLines(
				writer,
				pageIndex,
				absoluteY,
				writer.context().x + leftCenter,
				writer.context().x + rightCenter,
			);
		}
		let cellAbove;
		let currentCell;
		let rowCellAbove;
		let topBorder = false;
		let bottomBorder = false;
		let rowBottomBorder = false;

		for (let i = 0, l = processor.rowSpanData.length; i < l; i++) {
			cellAbove = undefined;
			currentCell = undefined;
			rowCellAbove = undefined;
			let data = processor.rowSpanData[i];
			let shouldDrawLine = !data.rowSpan;
			let borderColor = null;

			// draw only if the current cell requires a top border or the cell in the
			// row above requires a bottom border
			if (shouldDrawLine && i < l - 1) {
				topBorder = false;
				bottomBorder = false;
				rowBottomBorder = false;

				// the cell in the row above
				if (lineIndex > 0 && borderSide !== "top") {
					cellAbove = body[lineIndex - 1][i];
					bottomBorder = cellAbove.border ? cellAbove.border[3] : processor.layout.defaultBorder;
					if (bottomBorder && cellAbove.borderColor) {
						borderColor = cellAbove.borderColor[3];
					}
				}

				// the current cell
				if (lineIndex < body.length && borderSide !== "bottom") {
					currentCell = body[lineIndex][i];
					topBorder = currentCell.border
						? currentCell.border[1]
						: cellAbove?.border
							? false
							: processor.layout.defaultBorder;
					if (topBorder && borderColor == null && currentCell.borderColor) {
						borderColor = currentCell.borderColor[1];
					}
				}

				shouldDrawLine = topBorder || bottomBorder;
			}

			if (cellAbove && cellAbove._rowSpanCurrentOffset) {
				rowCellAbove = body[lineIndex - 1 - cellAbove._rowSpanCurrentOffset][i];
				rowBottomBorder =
					rowCellAbove && rowCellAbove.border
						? rowCellAbove.border[3]
						: processor.layout.defaultBorder;
				if (rowBottomBorder && rowCellAbove && rowCellAbove.borderColor) {
					borderColor = rowCellAbove.borderColor[3];
				}
			}

			if (borderColor == null) {
				borderColor =
					typeof processor.layout.hLineColor === "function"
						? processor.layout.hLineColor(styleLineIndex, processor.tableNode, i)
						: processor.layout.hLineColor;
			}

			if (!currentLine && shouldDrawLine) {
				currentLine = { left: data.left, width: 0 };
			}

			if (shouldDrawLine) {
				let colSpanIndex = 0;
				if (rowCellAbove && rowCellAbove.colSpan && rowBottomBorder) {
					while (rowCellAbove.colSpan > colSpanIndex) {
						currentLine!.width += processor.rowSpanData[i + colSpanIndex++].width || 0;
					}
					i += colSpanIndex - 1;
				} else if (cellAbove && cellAbove.colSpan && bottomBorder) {
					while (cellAbove.colSpan > colSpanIndex) {
						currentLine!.width += processor.rowSpanData[i + colSpanIndex++].width || 0;
					}
					i += colSpanIndex - 1;
				} else if (currentCell && currentCell.colSpan && topBorder) {
					while (currentCell.colSpan > colSpanIndex) {
						currentLine!.width += processor.rowSpanData[i + colSpanIndex++].width || 0;
					}
					i += colSpanIndex - 1;
				} else {
					currentLine!.width += processor.rowSpanData[i].width || 0;
				}
			}

			let y = (overrideY || 0) + offset;

			if (shouldDrawLine) {
				if (currentLine && currentLine.width) {
					let x1 = currentLine.left;
					let x2 = currentLine.left + currentLine.width;
					if (roundLeft && Math.abs(x1 - tableLeft) < 0.001) {
						x1 = leftCenter + processor.borderRadius;
					}
					if (roundRight && Math.abs(x2 - tableRight) < 0.001) {
						x2 = rightCenter - processor.borderRadius;
					}
					if (x2 <= x1) {
						currentLine = null;
						continue;
					}
					writer.addVector(
						{
							type: "line",
							x1,
							x2,
							y1: y,
							y2: y,
							lineWidth: lineWidth,
							dash: dash,
							lineColor: borderColor,
						},
						false,
						isNumber(overrideY),
						undefined,
						forcePage,
					);
					currentLine = null;
				}
			}
		}

		if (isRoundedEdge) {
			const radius = processor.borderRadius;
			const y = (overrideY || 0) + offset;
			const ignoreContextY = isNumber(overrideY);
			const pageIndex = forcePage ?? writer.context().page;
			const absoluteY = ignoreContextY ? y : writer.context().y + y;
			if (isTopRoundedEdge) processor.roundedTopByPage.set(pageIndex, absoluteY);
			if (isBottomRoundedEdge) {
				roundExistingPageBottom(
					writer,
					pageIndex,
					absoluteY,
					radius,
					writer.context().x + leftCenter,
					writer.context().x + rightCenter,
				);
			}
			if (roundLeft) {
				addRoundedCorner(
					processor,
					writer,
					isTopRoundedEdge ? "topLeft" : "bottomLeft",
					leftCenter,
					isTopRoundedEdge ? y : y - radius,
					radius,
					lineWidth,
					getHorizontalBorderColor(processor, leftCornerCell, horizontalSide, styleLineIndex, 0),
					dash,
					ignoreContextY,
					forcePage,
				);
			}
			if (roundRight) {
				addRoundedCorner(
					processor,
					writer,
					isTopRoundedEdge ? "topRight" : "bottomRight",
					rightCenter - radius,
					isTopRoundedEdge ? y : y - radius,
					radius,
					lineWidth,
					getHorizontalBorderColor(
						processor,
						rightCornerCell,
						horizontalSide,
						styleLineIndex,
						Math.max(0, boundaryColumn - 1),
					),
					dash,
					ignoreContextY,
					forcePage,
				);
			}
		}

		if (moveDown) {
			writer.context().moveDown(lineWidth);
		}
	}
}

export function drawVerticalLine(
	processor: TableProcessorState,
	x: number,
	y0: number,
	y1: number,
	vLineColIndex: number,
	writer: PageElementWriter,
	vLineRowIndex: number,
	beforeVLineColIndex: number | null,
	trim?: { top: number; bottom: number },
): void {
	let width = processor.layout.vLineWidth(vLineColIndex, processor.tableNode);
	if (width === 0) {
		return;
	}
	let style = processor.layout.vLineStyle(vLineColIndex, processor.tableNode);
	let dash;
	if (style && style.dash) {
		dash = style.dash;
	}

	let body = processor.tableNode.table!.body;
	let cellBefore;
	let currentCell;
	let borderColor;
	const beforeIndex = beforeVLineColIndex ?? 0;

	// the cell in the col before
	if (vLineColIndex > 0) {
		cellBefore = body[vLineRowIndex][beforeIndex];
		if (cellBefore && cellBefore.borderColor) {
			if (cellBefore.border ? cellBefore.border[2] : processor.layout.defaultBorder) {
				borderColor = cellBefore.borderColor[2];
			}
		}
	}

	// the current cell
	if (borderColor == null && vLineColIndex < body.length) {
		currentCell = body[vLineRowIndex][vLineColIndex];
		if (currentCell && currentCell.borderColor) {
			if (currentCell.border ? currentCell.border[0] : processor.layout.defaultBorder) {
				borderColor = currentCell.borderColor[0];
			}
		}
	}

	if (borderColor == null && cellBefore && cellBefore._rowSpanCurrentOffset) {
		let rowCellBeforeAbove = body[vLineRowIndex - cellBefore._rowSpanCurrentOffset][beforeIndex];
		if (rowCellBeforeAbove.borderColor) {
			if (
				rowCellBeforeAbove.border ? rowCellBeforeAbove.border[2] : processor.layout.defaultBorder
			) {
				borderColor = rowCellBeforeAbove.borderColor[2];
			}
		}
	}

	if (borderColor == null && currentCell && currentCell._rowSpanCurrentOffset) {
		let rowCurrentCellAbove =
			body[vLineRowIndex - currentCell._rowSpanCurrentOffset][vLineColIndex];
		if (rowCurrentCellAbove.borderColor) {
			if (
				rowCurrentCellAbove.border ? rowCurrentCellAbove.border[2] : processor.layout.defaultBorder
			) {
				borderColor = rowCurrentCellAbove.borderColor[2];
			}
		}
	}

	if (borderColor == null) {
		borderColor =
			typeof processor.layout.vLineColor === "function"
				? processor.layout.vLineColor(vLineColIndex, processor.tableNode, vLineRowIndex)
				: processor.layout.vLineColor;
	}

	const adjustedY0 = y0 + (trim?.top ?? 0);
	const adjustedY1 = y1 - (trim?.bottom ?? 0);
	if (adjustedY1 <= adjustedY0) return;

	writer.addVector(
		{
			type: "line",
			x1: x + width / 2,
			x2: x + width / 2,
			y1: adjustedY0,
			y2: adjustedY1,
			lineWidth: width,
			dash: dash,
			lineColor: borderColor,
		},
		false,
		true,
	);
}
