import { drawHorizontalLine, drawVerticalLine } from "./table-processor.borders";
import type PageElementWriter from "./element-writer.page";
import type { LayoutPdfNode, PdfTable, TableOffsets } from "../types/internal";
import type { TablePageBreak } from "./layout-builder.table";
import type { ResolvedTableLayout, RowSpanData } from "./table-processor.types";
import { beginTable, beginTableRow } from "./table-processor.lifecycle";
import { drawTableRowSegment, type TableLinePosition } from "./table-processor.rows";

class TableProcessor {
	tableNode: LayoutPdfNode;
	_isCurrentRowUnbreakable = false;
	offsets!: TableOffsets;
	layout!: ResolvedTableLayout;
	tableWidth = 0;
	tableOffset = 0;
	rowSpanData: RowSpanData[] = [];
	cleanUpRepeatables = false;
	headerRows = 0;
	rowsWithoutPageBreak = 0;
	dontBreakRows = false;
	topLineWidth = 0;
	rowPaddingTop = 0;
	bottomLineWidth = 0;
	rowPaddingBottom = 0;
	rowCallback: () => void = () => {};
	_tableTopBorderY?: number;
	rowTopPageY = 0;
	rowTopY = 0;
	rowXOffset = 0;
	reservedAtBottom = 0;
	headerRepeatable: ReturnType<PageElementWriter["currentBlockToRepeatable"]> | null = null;

	constructor(tableNode: LayoutPdfNode) {
		this.tableNode = tableNode;
		this._isCurrentRowUnbreakable = false;
	}

	private get table(): PdfTable<LayoutPdfNode> {
		return this.tableNode.table!;
	}

	beginTable(writer: PageElementWriter): void {
		beginTable(this, writer);
	}

	beginRow(rowIndex: number, writer: PageElementWriter): void {
		beginTableRow(this, rowIndex, writer);
	}

	drawHorizontalLine(
		lineIndex: number,
		writer: PageElementWriter,
		overrideY?: number,
		moveDown = true,
		forcePage?: number,
	): void {
		drawHorizontalLine(this, lineIndex, writer, overrideY, moveDown, forcePage);
	}

	drawVerticalLine(
		x: number,
		y0: number,
		y1: number,
		vLineColIndex: number,
		writer: PageElementWriter,
		vLineRowIndex: number,
		beforeVLineColIndex: number | null,
	): void {
		drawVerticalLine(this, x, y0, y1, vLineColIndex, writer, vLineRowIndex, beforeVLineColIndex);
	}
	endTable(writer: PageElementWriter): void {
		if (this.cleanUpRepeatables) {
			writer.popFromRepeatables();
		}
	}

	endRow(rowIndex: number, writer: PageElementWriter, pageBreaks: TablePageBreak[]): void {
		const getLineXs = () => {
			const result: TableLinePosition[] = [];
			let cols = 0;

			for (let i = 0, l = this.table.body[rowIndex].length; i < l; i++) {
				if (!cols) {
					result.push({ x: this.rowSpanData[i].left, index: i });

					let item = this.table.body[rowIndex][i];
					cols = item._colSpan || item.colSpan || 0;
				}
				if (cols > 0) {
					cols--;
				}
			}

			result.push({
				x: this.rowSpanData[this.rowSpanData.length - 1].left,
				index: this.rowSpanData.length - 1,
			});

			return result;
		};

		writer.removeListener("pageChanged", this.rowCallback);
		writer.context().moveDown(this.layout.paddingBottom(rowIndex, this.tableNode));
		writer.context().availableHeight += this.reservedAtBottom;

		let endingPage = writer.context().page;
		let endingY = writer.context().y;
		let endingAvailableHeight = writer.context().availableHeight;
		let endingX = writer.context().x;
		let endingAvailableWidth = writer.context().availableWidth;

		let xs = getLineXs();

		const ys: Array<{ y0: number; y1?: number; page: number }> = [];

		let hasBreaks = pageBreaks && pageBreaks.length > 0;
		ys.push({
			y0: this.rowTopY,
			page: hasBreaks ? pageBreaks[0].prevPage : endingPage,
		});

		if (hasBreaks) {
			for (let i = 0, l = pageBreaks.length; i < l; i++) {
				let pageBreak = pageBreaks[i];
				ys[ys.length - 1].y1 = pageBreak.prevY;

				ys.push({ y0: pageBreak.y, page: pageBreak.prevPage + 1 });
			}
		}

		ys[ys.length - 1].y1 = endingY;

		let skipOrphanePadding = ys[0].y1! - ys[0].y0 === this.rowPaddingTop;
		if (
			rowIndex === 0 &&
			!skipOrphanePadding &&
			!this.rowsWithoutPageBreak &&
			!this.dontBreakRows
		) {
			// Draw the top border of the table
			let pageTableStartedAt: number | undefined;
			if (pageBreaks && pageBreaks.length > 0) {
				// Get the page where table started at
				pageTableStartedAt = pageBreaks[0].prevPage;
			}
			this.drawHorizontalLine(0, writer, this._tableTopBorderY, false, pageTableStartedAt);
		}
		for (let yi = skipOrphanePadding ? 1 : 0, yl = ys.length; yi < yl; yi++) {
			let willBreak = yi < ys.length - 1;
			let rowBreakWithoutHeader = yi > 0 && !this.headerRows;
			let hzLineOffset = rowBreakWithoutHeader ? 0 : this.topLineWidth;
			let y1 = ys[yi].y0;
			let y2 = ys[yi].y1!;

			if (willBreak) {
				y2 = y2 + this.rowPaddingBottom;
			}

			if (writer.context().page != ys[yi].page) {
				writer.context().page = ys[yi].page;
			}
			const segmentContext = writer.context();
			const segmentPage =
				typeof segmentContext.getCurrentPage === "function"
					? segmentContext.getCurrentPage()
					: segmentContext.pages?.[segmentContext.page];
			if (segmentPage) {
				segmentContext.pageMargins = segmentPage.pageMargins;
				segmentContext.x = segmentPage.pageMargins.left + this.rowXOffset;
				segmentContext.availableWidth =
					segmentPage.pageSize.width - segmentContext.x - segmentPage.pageMargins.right;
			}

			// Draw horizontal lines before the vertical lines so they are not overridden
			if (willBreak && this.layout.hLineWhenBroken !== false) {
				this.drawHorizontalLine(rowIndex + 1, writer, y2, false);
			}
			if (rowBreakWithoutHeader && this.layout.hLineWhenBroken !== false) {
				this.drawHorizontalLine(rowIndex, writer, y1, false);
			}

			drawTableRowSegment(this, rowIndex, writer, xs, {
				y1,
				y2,
				willBreak,
				horizontalLineOffset: hzLineOffset,
			});
		}

		writer.context().page = endingPage;
		writer.context().y = endingY;
		writer.context().availableHeight = endingAvailableHeight;
		writer.context().x = endingX;
		writer.context().availableWidth = endingAvailableWidth;
		const restoredPage =
			typeof writer.context().getCurrentPage === "function"
				? writer.context().getCurrentPage()
				: writer.context().pages?.[writer.context().page];
		if (restoredPage) writer.context().pageMargins = restoredPage.pageMargins;

		let row = this.table.body[rowIndex];
		for (let i = 0, l = row.length; i < l; i++) {
			const cell = row[i];
			const rowSpan = cell.rowSpan ?? 0;
			if (rowSpan) {
				this.rowSpanData[i].rowSpan = rowSpan;

				// fix colSpans
				if (cell.colSpan && cell.colSpan > 1) {
					for (let j = 1; j < rowSpan; j++) {
						this.table.body[rowIndex + j][i]._colSpan = cell.colSpan;
					}
				}

				// fix rowSpans
				if (rowSpan > 1) {
					for (let j = 1; j < rowSpan; j++) {
						this.table.body[rowIndex + j][i]._rowSpanCurrentOffset = j;
					}
				}
			}

			if (this.rowSpanData[i].rowSpan > 0) {
				this.rowSpanData[i].rowSpan--;
			}
		}

		this.drawHorizontalLine(rowIndex + 1, writer);

		if (this.headerRows && rowIndex === this.headerRows - 1) {
			this.headerRepeatable = writer.currentBlockToRepeatable();
		}

		const shouldCommitCurrentRowUnbreakable =
			this.dontBreakRows && (rowIndex === 0 || this._isCurrentRowUnbreakable);

		if (shouldCommitCurrentRowUnbreakable) {
			const pageChangedCallback = () => {
				if (rowIndex > 0 && !this.headerRows && this.layout.hLineWhenBroken !== false) {
					// Draw the top border of the row after a page break
					this.drawHorizontalLine(rowIndex, writer);
				}
			};

			writer.addListener("pageChanged", pageChangedCallback);

			writer.commitUnbreakableBlock();

			writer.removeListener("pageChanged", pageChangedCallback);
		}

		this._isCurrentRowUnbreakable = false;

		if (
			this.headerRepeatable &&
			(rowIndex === this.rowsWithoutPageBreak - 1 || rowIndex === this.table.body.length - 1)
		) {
			writer.commitUnbreakableBlock();
			writer.pushToRepeatables(this.headerRepeatable);
			this.cleanUpRepeatables = true;
			this.headerRepeatable = null;
		}
	}
}

export default TableProcessor;
