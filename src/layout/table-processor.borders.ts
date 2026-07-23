import { isNumber } from "../utils/variable-type";
import type PageElementWriter from "./element-writer.page";
import type { TableProcessorState } from "./table-processor.types";

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
					writer.addVector(
						{
							type: "line",
							x1: currentLine.left,
							x2: currentLine.left + currentLine.width,
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

	writer.addVector(
		{
			type: "line",
			x1: x + width / 2,
			x2: x + width / 2,
			y1: y0,
			y2: y1,
			lineWidth: width,
			dash: dash,
			lineColor: borderColor,
		},
		false,
		true,
	);
}
