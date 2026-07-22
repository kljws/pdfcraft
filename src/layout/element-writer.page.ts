import ElementWriter, { type ElementWriterEvents } from "./element-writer";
import { normalizePageSize, normalizePageMargin } from "../configuration/page-size";
import type { PageOrientation } from "../types";
import type DocumentContext from "../document/document-context";
import EventEmitter from "../utils/event-emitter";
import type { EventArgs, EventKey, EventListener } from "../utils/event-emitter";
import type {
	CurrentPosition,
	LayoutPdfNode,
	LineLike,
	PageItem,
	PageMarginDefinition,
} from "../types/internal";
import { getFragmentHeight } from "./element-writer.helpers";

interface ElementFragment {
	items: PageItem[];
	height: number;
	xOffset?: number;
	yOffset?: number;
	insertedOnPages: boolean[];
}

/**
 * An extended ElementWriter which can handle:
 * - page-breaks (it adds new pages when there's not enough space left),
 * - repeatable fragments (like table-headers, which are repeated everytime
 *                         a page-break occurs)
 * - transactions (used for unbreakable-blocks when we want to make sure
 *                 whole block will be rendered on the same page)
 */
class PageElementWriter {
	private readonly writer: ElementWriter;
	private readonly events = new EventEmitter<ElementWriterEvents>();
	transactionLevel: number;
	repeatables: ElementFragment[];
	originalX = 0;

	/**
	 * @param context
	 */
	constructor(context: DocumentContext) {
		this.writer = new ElementWriter(context, (line) => this.emit("lineAdded", line));
		this.transactionLevel = 0;
		this.repeatables = [];
	}

	addListener<Event extends EventKey<ElementWriterEvents>>(
		event: Event,
		listener: EventListener<EventArgs<ElementWriterEvents, Event>>,
	): this {
		this.events.addListener(event, listener);
		return this;
	}

	removeListener<Event extends EventKey<ElementWriterEvents>>(
		event: Event,
		listener: EventListener<EventArgs<ElementWriterEvents, Event>>,
	): this {
		this.events.removeListener(event, listener);
		return this;
	}

	emit<Event extends EventKey<ElementWriterEvents>>(
		event: Event,
		...args: EventArgs<ElementWriterEvents, Event>
	): boolean {
		return this.events.emit(event, ...args);
	}

	get contextStack(): DocumentContext[] {
		return this.writer.contextStack;
	}

	context(): DocumentContext {
		return this.writer.context();
	}

	addLine(
		line: LineLike,
		dontUpdateContextPosition?: boolean,
		index?: number,
	): CurrentPosition | false {
		return this._fitOnPage(() => this.writer.addLine(line, dontUpdateContextPosition, index));
	}

	addImage(image: LayoutPdfNode, index?: number): CurrentPosition | false {
		return this._fitOnPage(() => this.writer.addImage(image, index));
	}

	addCanvas(image: LayoutPdfNode, index?: number): false | Array<CurrentPosition | undefined> {
		return this._fitOnPage(() => this.writer.addCanvas(image, index));
	}

	addSVG(image: LayoutPdfNode, index?: number): CurrentPosition | false {
		return this._fitOnPage(() => this.writer.addSVG(image, index));
	}

	addQr(qr: LayoutPdfNode, index?: number): CurrentPosition | false {
		return this._fitOnPage(() => this.writer.addQr(qr, index));
	}

	addAttachment(attachment: LayoutPdfNode, index?: number): CurrentPosition | false {
		return this._fitOnPage(() => this.writer.addAttachment(attachment, index));
	}

	addVector(...parameters: Parameters<ElementWriter["addVector"]>): CurrentPosition | undefined {
		return this.writer.addVector(...parameters);
	}

	beginClip(width: number, height: number): boolean {
		return this.writer.beginClip(width, height);
	}

	endClip(): boolean {
		return this.writer.endClip();
	}

	beginVerticalAlignment(verticalAlignment?: string): PageItem {
		return this.writer.beginVerticalAlignment(verticalAlignment);
	}

	endVerticalAlignment(verticalAlignment?: string): PageItem {
		return this.writer.endVerticalAlignment(verticalAlignment);
	}

	addFragment(
		fragment: ElementFragment,
		useBlockXOffset?: boolean,
		useBlockYOffset?: boolean,
		dontUpdateContextPosition?: boolean,
	): boolean {
		return this._fitOnPage(() =>
			this.writer.addFragment(
				fragment,
				useBlockXOffset,
				useBlockYOffset,
				dontUpdateContextPosition,
			),
		);
	}

	pushContext(contextOrWidth?: DocumentContext | number, height?: number): void {
		this.writer.pushContext(contextOrWidth, height);
	}

	popContext(): void {
		this.writer.popContext();
	}

	getCurrentPositionOnPage(): CurrentPosition {
		return this.writer.getCurrentPositionOnPage();
	}

	moveToNextPage(pageOrientation?: PageOrientation): void {
		let nextPage = this.context().moveToNextPage(pageOrientation);

		// moveToNextPage is called multiple times for table, because is called for each column
		// and repeatables are inserted only in the first time. If columns are used, is needed
		// call for table in first column and then for table in the second column (is other repeatables).
		this.repeatables.forEach(function (this: PageElementWriter, rep): void {
			if (rep.insertedOnPages[this.context().page] === undefined) {
				rep.insertedOnPages[this.context().page] = true;
				this.addFragment(rep, true);
			} else {
				this.context().moveDown(rep.height);
			}
		}, this);

		this.emit("pageChanged", {
			prevPage: nextPage.prevPage,
			prevY: nextPage.prevY,
			y: this.context().y,
		});
	}

	addPage(
		pageSize: Parameters<typeof normalizePageSize>[0],
		pageOrientation: Parameters<typeof normalizePageSize>[1] | null,
		pageMargin: PageMarginDefinition,
		customProperties: Record<string, unknown> = {},
	): void {
		const prevPage = this.context().page;
		const prevY = this.context().y;

		this.context().addPage(
			normalizePageSize(pageSize, pageOrientation ?? undefined),
			normalizePageMargin(pageMargin),
			customProperties,
		);

		this.emit("pageChanged", {
			prevPage: prevPage,
			prevY: prevY,
			y: this.context().y,
		});
	}

	beginUnbreakableBlock(width?: number, height?: number): void {
		if (this.transactionLevel++ === 0) {
			this.originalX = this.context().x;
			this.pushContext(width, height);
		}
	}

	commitUnbreakableBlock(forcedX?: number, forcedY?: number): void {
		if (--this.transactionLevel === 0) {
			let unbreakableContext = this.context();
			this.popContext();

			let nbPages = unbreakableContext.pages.length;
			if (nbPages > 0) {
				// no support for multi-page unbreakableBlocks
				const fragment: ElementFragment = {
					items: unbreakableContext.pages[0].items,
					height: 0,
					xOffset: forcedX,
					yOffset: forcedY,
					insertedOnPages: [],
				};

				if (nbPages > 1) {
					// on out-of-context blocs (headers, footers, background) height should be the whole DocumentContext height
					if (forcedX !== undefined || forcedY !== undefined) {
						fragment.height =
							unbreakableContext.getCurrentPage().pageSize.height -
							unbreakableContext.pageMargins.top -
							unbreakableContext.pageMargins.bottom;
					} else {
						fragment.height =
							this.context().getCurrentPage().pageSize.height -
							this.context().pageMargins.top -
							this.context().pageMargins.bottom;
						for (let i = 0, l = this.repeatables.length; i < l; i++) {
							fragment.height -= this.repeatables[i].height;
						}
					}
				} else {
					fragment.height = getFragmentHeight(fragment.items, unbreakableContext.y);
				}

				if (forcedX !== undefined || forcedY !== undefined) {
					this.writer.addFragment(fragment, true, true, true);
				} else {
					this.addFragment(fragment);
				}
			}
		}
	}

	currentBlockToRepeatable(): ElementFragment {
		let unbreakableContext = this.context();
		const rep: ElementFragment = { items: [], height: 0, insertedOnPages: [] };

		unbreakableContext.pages[0].items.forEach((item: PageItem) => {
			rep.items.push(item);
		});

		rep.xOffset = this.originalX;

		rep.height = getFragmentHeight(rep.items, unbreakableContext.y);

		rep.insertedOnPages = [];

		return rep;
	}

	pushToRepeatables(rep: ElementFragment): void {
		this.repeatables.push(rep);
	}

	popFromRepeatables(): void {
		this.repeatables.pop();
	}

	/**
	 * Move to the next column in a column group (snaking columns).
	 * Handles repeatables and emits columnChanged event.
	 */
	moveToNextColumn(): void {
		let nextColumn = this.context().moveToNextColumn();

		// Handle repeatables (like table headers) for the new column
		this.repeatables.forEach(function (this: PageElementWriter, rep): void {
			// In snaking columns, we WANT headers to repeat.
			// However, in Standard Page Breaks, headers are drawn using useBlockXOffset=true (original absolute X).
			// This works for page breaks because margins are consistent.
			// In Snaking Columns, the X position changes for each column.
			// If we use true, the header is drawn at the *original* X position (Col 1), overlapping/invisible.
			// We MUST use false to force drawing relative to the CURRENT context X (new column start).
			this.addFragment(rep, false);
		}, this);

		this.emit("columnChanged", {
			prevY: nextColumn.prevY,
			y: this.context().y,
		});
	}

	/**
	 * Check if currently in a column group that can move to next column.
	 * Only returns true if snakingColumns is enabled for the column group.
	 * @returns
	 */
	canMoveToNextColumn(): boolean {
		let ctx = this.context();
		let snakingSnapshot = ctx.getSnakingSnapshot();

		if (snakingSnapshot) {
			// Check if we're inside a nested (non-snaking) column group.
			// If so, don't allow a snaking column move — it would corrupt
			// the inner row's layout (e.g. product name in col 1, price in col 2).
			// The inner row should complete via normal page break instead.
			for (let i = ctx.snapshots.length - 1; i >= 0; i--) {
				let snap = ctx.snapshots[i];
				if (snap.snakingColumns) {
					break; // Reached the snaking snapshot, no inner groups found
				}
				if (!snap.overflowed) {
					return false; // Found a non-snaking, non-overflowed inner group
				}
			}

			let overflowCount = 0;
			for (let i = ctx.snapshots.length - 1; i >= 0; i--) {
				if (ctx.snapshots[i].overflowed) {
					overflowCount++;
				} else {
					break;
				}
			}

			if (
				snakingSnapshot.columnWidths &&
				overflowCount >= snakingSnapshot.columnWidths.length - 1
			) {
				return false;
			}

			let currentColumnWidth = ctx.availableWidth || ctx.lastColumnWidth || 0;
			let nextColumnWidth = snakingSnapshot.columnWidths
				? snakingSnapshot.columnWidths[overflowCount + 1]
				: currentColumnWidth;
			let nextX = ctx.x + currentColumnWidth + (snakingSnapshot.gap || 0);
			let page = ctx.getCurrentPage();
			let pageWidth = page.pageSize.width;
			let rightMargin = page.pageMargins ? page.pageMargins.right : 0;
			let parentRightMargin = ctx.marginXTopParent ? ctx.marginXTopParent[1] : 0;
			let rightBoundary = pageWidth - rightMargin - parentRightMargin;

			return nextX + nextColumnWidth <= rightBoundary + 1;
		}
		return false;
	}

	_fitOnPage<T>(addFct: () => T | false): T | false {
		let position = addFct();
		if (!position) {
			if (this.canMoveToNextColumn()) {
				this.moveToNextColumn();
				position = addFct();
			}

			if (!position) {
				let ctx = this.context();
				let snakingSnapshot = ctx.getSnakingSnapshot();

				if (snakingSnapshot) {
					if (ctx.isInNestedNonSnakingGroup()) {
						// Inside a table cell within snaking columns — use standard page break.
						// Don't reset snaking state; the table handles its own breaks.
						// Column breaks happen between rows in processTable instead.
						this.moveToNextPage();
					} else {
						this.moveToNextPage();

						// Save lastColumnWidth before reset — if we're inside a nested
						// column group (e.g. product/price row), the reset would overwrite
						// it with the snaking column width, corrupting inner column layout.
						let savedLastColumnWidth = ctx.lastColumnWidth;
						ctx.resetSnakingColumnsForNewPage();
						ctx.lastColumnWidth = savedLastColumnWidth;
					}

					position = addFct();
				} else {
					while (ctx.snapshots.length > 0 && ctx.snapshots[ctx.snapshots.length - 1].overflowed) {
						let popped = ctx.snapshots.pop();
						let prevSnapshot = ctx.snapshots[ctx.snapshots.length - 1];
						if (prevSnapshot) {
							ctx.x = prevSnapshot.x;
							ctx.y = prevSnapshot.y;
							ctx.availableHeight = prevSnapshot.availableHeight;
							ctx.availableWidth = popped?.availableWidth ?? prevSnapshot.availableWidth;
							ctx.lastColumnWidth = prevSnapshot.lastColumnWidth;
						}
					}

					this.moveToNextPage();
					position = addFct();
				}
			}
		}
		return position;
	}
}

export default PageElementWriter;
