import type { PageOrientation } from "../types";
import type { Metadata, PageMargins, PageMarginSource, PageSize, PdfPage } from "../types/internal";
import { normalizePageMargin } from "../configuration/page-size";
import {
	beginColumn,
	beginColumnGroup,
	calculateBottomMost,
	completeColumnGroup,
	markEnding,
	resetMarginXTopParent,
	saveContextInEndingCell,
	updateBottomByPage,
} from "./document-context.columns";
import { bottomMostContext, getPageSize } from "./document-context.geometry";
import { createPage, getPagePosition } from "./document-context.helpers";
import {
	getSnakingSnapshot,
	inSnakingColumns,
	isInNestedNonSnakingGroup,
	moveToNextColumn,
	resetSnakingColumnsForNewPage,
} from "./document-context.snaking";
import type {
	ColumnEndingCell,
	ContextSnapshot,
	DocumentContextEvents,
	PagePosition,
} from "./document-context.types";
import EventEmitter from "../utils/event-emitter";
import type { EventArgs, EventKey, EventListener } from "../utils/event-emitter";

class DocumentContext {
	pages: PdfPage[] = [];
	pageMargins: PageMargins = { left: 0, right: 0, top: 0, bottom: 0 };
	pageMarginSource: PageMarginSource = this.pageMargins;
	pageCount = 0;
	pageMarginFunctionUsed = false;
	x = 0;
	y = 0;
	availableWidth = 0;
	availableHeight = 0;
	page = -1;
	snapshots: ContextSnapshot[] = [];
	backgroundLength: number[] = [];
	lastColumnWidth = 0;
	marginXTopParent: [number, number] | null = null;
	height = 0;

	private readonly events = new EventEmitter<DocumentContextEvents>();
	addListener<Event extends EventKey<DocumentContextEvents>>(
		event: Event,
		listener: EventListener<EventArgs<DocumentContextEvents, Event>>,
	): this {
		this.events.addListener(event, listener);
		return this;
	}

	removeListener<Event extends EventKey<DocumentContextEvents>>(
		event: Event,
		listener: EventListener<EventArgs<DocumentContextEvents, Event>>,
	): this {
		this.events.removeListener(event, listener);
		return this;
	}

	emit<Event extends EventKey<DocumentContextEvents>>(
		event: Event,
		...args: EventArgs<DocumentContextEvents, Event>
	): boolean {
		return this.events.emit(event, ...args);
	}

	getSnakingSnapshot(): ContextSnapshot | null {
		return getSnakingSnapshot(this);
	}

	inSnakingColumns(): boolean {
		return inSnakingColumns(this);
	}

	isInNestedNonSnakingGroup(): boolean {
		return isInNestedNonSnakingGroup(this);
	}

	moveToNextColumn(): { prevY: number; y: number } {
		return moveToNextColumn(this, (destination, endingCell) =>
			calculateBottomMost(this, destination, endingCell),
		);
	}

	resetSnakingColumnsForNewPage(): void {
		resetSnakingColumnsForNewPage(this, () => this.getCurrentPage());
	}

	beginColumnGroup(
		marginXTopParent: [number, number] | null = null,
		bottomByPage: Record<number, number> = {},
		snakingColumns = false,
		columnGap = 0,
		columnWidths: number[] | null = null,
	): void {
		beginColumnGroup(this, marginXTopParent, bottomByPage, snakingColumns, columnGap, columnWidths);
	}

	updateBottomByPage(): void {
		updateBottomByPage(this);
	}

	resetMarginXTopParent(): void {
		resetMarginXTopParent(this);
	}

	beginColumn(
		width: number = this.availableWidth,
		offset = 0,
		endingCell: ColumnEndingCell | null = null,
	): void {
		beginColumn(this, width, offset, endingCell);
	}

	calculateBottomMost(destination: ContextSnapshot, endingCell: ColumnEndingCell | null): void {
		calculateBottomMost(this, destination, endingCell);
	}

	markEnding(endingCell: ColumnEndingCell, originalXOffset = 0, discountY = 0): void {
		markEnding(this, endingCell, originalXOffset, discountY);
	}

	saveContextInEndingCell(endingCell: ColumnEndingCell): void {
		saveContextInEndingCell(this, endingCell);
	}

	completeColumnGroup(
		height = 0,
		endingCell: ColumnEndingCell | null | undefined = null,
	): Record<number, number> {
		return completeColumnGroup(this, height, endingCell);
	}

	addMargin(left: number, right = 0): void {
		this.x += left;
		this.availableWidth -= left + right;
	}

	moveDown(offset: number): boolean {
		this.y += offset;
		this.availableHeight -= offset;
		return this.availableHeight > 0;
	}

	restoreColumnStateAfterPageBreak(previous: {
		x: number;
		availableWidth: number;
		pageMargins: PageMargins;
	}): void {
		if (this.snapshots.length === 0) return;
		const currentMargins = this.getCurrentPage().pageMargins;
		const translateX = (x: number): number => currentMargins.left + (x - previous.pageMargins.left);
		const currentState = {
			x: translateX(previous.x),
			y: this.y,
			page: this.page,
			availableHeight: this.availableHeight,
			availableWidth: previous.availableWidth,
		};

		this.x = currentState.x;
		this.availableWidth = previous.availableWidth;
		for (const snapshot of this.snapshots) {
			snapshot.x = translateX(snapshot.x);
			snapshot.y = this.y;
			snapshot.page = this.page;
			snapshot.availableHeight = this.availableHeight;
			snapshot.bottomMost = bottomMostContext(currentState, snapshot.bottomMost ?? currentState);
		}
	}

	initializePage(): void {
		this.pageMargins = this.getCurrentPage().pageMargins ?? this.pageMargins;
		this.y = this.pageMargins.top;
		this.availableHeight =
			this.getCurrentPage().pageSize.height - this.pageMargins.top - this.pageMargins.bottom;
		const { pageCtx, isSnapshot } = this.pageSnapshot();
		pageCtx.availableWidth =
			this.getCurrentPage().pageSize.width - this.pageMargins.left - this.pageMargins.right;
		if (isSnapshot && this.marginXTopParent) {
			pageCtx.availableWidth -= this.marginXTopParent[0] + this.marginXTopParent[1];
		}
	}

	pageSnapshot(): { pageCtx: ContextSnapshot | DocumentContext; isSnapshot: boolean } {
		return this.snapshots[0]
			? { pageCtx: this.snapshots[0], isSnapshot: true }
			: { pageCtx: this, isSnapshot: false };
	}

	moveTo(x: number, y: number): void {
		const margins = this.getCurrentPage().pageMargins;
		if (x != null) {
			this.x = x;
			this.availableWidth = this.getCurrentPage().pageSize.width - x - margins.right;
		}
		if (y != null) {
			this.y = y;
			this.availableHeight = this.getCurrentPage().pageSize.height - y - margins.bottom;
		}
	}

	moveToRelative(x: number, y: number): void {
		if (x != null) this.x += x;
		if (y != null) this.y += y;
	}

	beginDetachedBlock(): void {
		this.snapshots.push({
			x: this.x,
			y: this.y,
			availableHeight: this.availableHeight,
			availableWidth: this.availableWidth,
			page: this.page,
			lastColumnWidth: this.lastColumnWidth,
			bottomByPage: {},
			bottomMost: {
				x: this.x,
				y: this.y,
				availableHeight: this.availableHeight,
				availableWidth: this.availableWidth,
				page: this.page,
			},
		});
	}

	endDetachedBlock(): void {
		const saved = this.snapshots.pop();
		if (!saved) return;
		this.x = saved.x;
		this.y = saved.y;
		this.availableWidth = saved.availableWidth;
		this.availableHeight = saved.availableHeight;
		this.page = saved.page;
		this.pageMargins = this.getCurrentPage().pageMargins;
		this.lastColumnWidth = saved.lastColumnWidth;
	}

	moveToNextPage(pageOrientation?: PageOrientation): {
		newPageCreated: boolean;
		prevPage: number;
		prevY: number;
		y: number;
	} {
		const nextPageIndex = this.page + 1;
		const prevPage = this.page;
		let prevY = this.y;
		const lastSnapshot = this.snapshots.at(-1);
		if (lastSnapshot?.bottomMost?.y) {
			prevY = Math.max(this.y, lastSnapshot.bottomMost.y);
		}

		const createNewPage = nextPageIndex >= this.pages.length;
		if (createNewPage) {
			const currentPage = this.getCurrentPage();
			const leftOffset = this.x - currentPage.pageMargins.left;
			const rightOffset =
				currentPage.pageSize.width - currentPage.pageMargins.right - (this.x + this.availableWidth);
			const pageSize = getPageSize(currentPage, pageOrientation);
			this.addPage(pageSize, null, this.getCurrentPage().customProperties);
			const nextPage = this.getCurrentPage();
			this.x = nextPage.pageMargins.left + leftOffset;
			this.availableWidth =
				nextPage.pageSize.width -
				nextPage.pageMargins.left -
				nextPage.pageMargins.right -
				leftOffset -
				rightOffset;
		} else {
			this.page = nextPageIndex;
			this.initializePage();
		}

		return { newPageCreated: createNewPage, prevPage, prevY, y: this.y };
	}

	addPage(
		pageSize: PageSize,
		pageMargin: PageMarginSource | null = null,
		customProperties: Metadata = {},
	): PdfPage {
		if (pageMargin !== null) {
			this.pageMarginSource = pageMargin;
		}
		let evaluatedMargins: PageMargins;
		if (typeof this.pageMarginSource === "function") {
			this.pageMarginFunctionUsed = true;
			evaluatedMargins = normalizePageMargin(
				this.pageMarginSource(this.pages.length + 1, this.pageCount, pageSize),
			);
		} else {
			evaluatedMargins = normalizePageMargin(this.pageMarginSource);
		}
		this.pageMargins = evaluatedMargins;
		this.x = evaluatedMargins.left;
		this.availableWidth = pageSize.width - evaluatedMargins.left - evaluatedMargins.right;

		const page = createPage(pageSize, evaluatedMargins, customProperties);
		this.pages.push(page);
		this.backgroundLength.push(0);
		this.page = this.pages.length - 1;
		this.initializePage();
		this.emit("pageAdded", page);
		return page;
	}

	getCurrentPage(): PdfPage {
		return this.pages[this.page];
	}

	getCurrentPosition(): PagePosition {
		const page = this.getCurrentPage();
		return getPagePosition(page, this.page, page.pageMargins, this.x, this.y);
	}
}

export { bottomMostContext };
export default DocumentContext;
