import ElementWriter, {
	type ElementPlacementAdapter,
	type ElementWriterEvents,
} from "./element-writer";
import { normalizePageSize, normalizePageMargin } from "../configuration/page-size";
import type { PageOrientation } from "../types";
import type DocumentContext from "../document/document-context";
import EventEmitter from "../utils/event-emitter";
import type { EventArgs, EventKey, EventListener } from "../utils/event-emitter";
import type {
	CurrentPosition,
	LayoutPdfNode,
	LineLike,
	PageControlItem,
	PageItem,
	PageMarginSource,
	Vector,
} from "../types/internal";
import type { NodePlaceResult } from "../engine/contracts/node-feature";
import { getFragmentHeight } from "./element-writer.helpers";

type ElementFragment = {
	items: PageItem[];
	height: number;
	xOffset?: number | undefined;
	yOffset?: number | undefined;
	insertedOnPages: boolean[];
	pageMarginLeft?: number | undefined;
};

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

	constructor(context: DocumentContext, placement: ElementPlacementAdapter) {
		this.writer = new ElementWriter(context, (line) => this.emit("lineAdded", line), placement);
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
		return this._fitOnPage((allowOverflow) =>
			this.writer.addLine(
				line,
				dontUpdateContextPosition,
				index,
				allowOverflow || this.context().getCurrentPage()?.items.length === 0,
			),
		);
	}

	addFeatureItem(featureKind: string, node: LayoutPdfNode, index?: number): NodePlaceResult {
		return this._fitOnPage((allowOverflow) =>
			this.writer.addFeatureItem(featureKind, node, index, allowOverflow),
		);
	}

	addVector(...parameters: Parameters<ElementWriter["addVector"]>): CurrentPosition | undefined {
		return this.writer.addVector(...parameters);
	}

	/**
	 * Adds a vector behind the content of the current page: after its background items, before
	 * everything else, including when an unbreakable block is replayed onto a page.
	 */
	addVectorBehindContent(
		vector: Vector,
		ignoreContextX?: boolean,
		ignoreContextY?: boolean,
	): CurrentPosition | undefined {
		const context = this.context();
		return this.writer.addVector(
			vector,
			ignoreContextX,
			ignoreContextY,
			context.backgroundLength[context.page],
			undefined,
			"behindContent",
		);
	}

	beginVerticalAlignment(verticalAlignment?: string): PageControlItem {
		return this.writer.beginVerticalAlignment(verticalAlignment);
	}

	endVerticalAlignment(verticalAlignment?: string): PageControlItem {
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

	moveToNextPage(pageOrientation?: PageOrientation): void {
		const previousPage = this.context().getCurrentPage();
		const previousMargins = previousPage?.pageMargins ?? this.context().pageMargins;
		const previousColumnState =
			previousPage && this.context().snapshots.length > 0 && !this.context().getFlowSnapshot()
				? {
						x: this.context().x,
						availableWidth: this.context().availableWidth,
						pageMargins: previousMargins,
					}
				: null;
		const nextPage = this.context().moveToNextPage(pageOrientation);

		// moveToNextPage is called multiple times for table, because is called for each column
		// and repeatables are inserted only in the first time. If columns are used, is needed
		// call for table in first column and then for table in the second column (is other repeatables).
		this.repeatables.forEach(function (this: PageElementWriter, rep): void {
			if (rep.insertedOnPages[this.context().page] === undefined) {
				rep.insertedOnPages[this.context().page] = true;
				const currentLeft = this.context().requireCurrentPage().pageMargins.left;
				const fragment =
					rep.pageMarginLeft === undefined
						? rep
						: {
								...rep,
								xOffset: (rep.xOffset ?? 0) + currentLeft - rep.pageMarginLeft,
							};
				this.addFragment(fragment, true);
			} else {
				this.context().moveDown(rep.height);
			}
		}, this);

		this.emit("pageChanged", {
			prevPage: nextPage.prevPage,
			prevY: nextPage.prevY,
			y: this.context().y,
		});

		const currentMargins =
			this.context().getCurrentPage()?.pageMargins ?? this.context().pageMargins;
		if (
			previousColumnState &&
			(previousColumnState.pageMargins.left !== currentMargins.left ||
				previousColumnState.pageMargins.right !== currentMargins.right)
		) {
			this.context().restoreColumnStateAfterPageBreak(previousColumnState);
		}
	}

	addPage(
		pageSize: Parameters<typeof normalizePageSize>[0],
		pageOrientation: Parameters<typeof normalizePageSize>[1] | null,
		pageMargin: PageMarginSource,
		customProperties: Record<string, unknown> = {},
	): void {
		const prevPage = this.context().page;
		const prevY = this.context().y;

		this.context().addPage(
			normalizePageSize(pageSize, pageOrientation ?? undefined),
			typeof pageMargin === "function" ? pageMargin : normalizePageMargin(pageMargin),
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
			this.writer.pushContext(width, height);
		}
	}

	commitUnbreakableBlock(
		forcedX?: number,
		forcedY?: number,
		detachedOverflowMessage?: string,
	): number | undefined {
		if (--this.transactionLevel === 0) {
			const unbreakableContext = this.context();
			this.writer.popContext();

			const nbPages = unbreakableContext.pages.length;
			const firstPage = unbreakableContext.pages[0];
			if (firstPage) {
				if (forcedX !== undefined || forcedY !== undefined) {
					const firstPageContentHeight = getFragmentHeight(
						firstPage.items,
						nbPages === 1 ? unbreakableContext.y : firstPage.pageSize.height,
					);
					if (
						detachedOverflowMessage &&
						(nbPages > 1 || firstPageContentHeight > firstPage.pageSize.height)
					) {
						throw new Error(detachedOverflowMessage);
					}
					const fragment: ElementFragment = {
						items: firstPage.items,
						height: 0,
						xOffset: forcedX,
						yOffset: forcedY,
						insertedOnPages: [],
					};

					// Detached content belongs to the current output page. Keep its historical
					// single-page behavior even if its temporary context overflowed.
					if (nbPages > 1) {
						fragment.height =
							unbreakableContext.requireCurrentPage().pageSize.height -
							unbreakableContext.pageMargins.top -
							unbreakableContext.pageMargins.bottom;
					} else {
						fragment.height = getFragmentHeight(fragment.items, unbreakableContext.y);
					}

					this.writer.addFragment(fragment, true, true, true);
					return fragment.height;
				}

				for (const [pageIndex, sourcePage] of unbreakableContext.pages.entries()) {
					const isLastPage = pageIndex === nbPages - 1;
					const fragment: ElementFragment = {
						items: sourcePage.items,
						height: isLastPage
							? getFragmentHeight(sourcePage.items, unbreakableContext.y)
							: sourcePage.pageSize.height -
								sourcePage.pageMargins.top -
								sourcePage.pageMargins.bottom,
						insertedOnPages: [],
					};

					if (!this.addFragment(fragment)) {
						// Repeated headers can leave less usable height than the temporary page.
						// Preserve the laid-out fragment once on the fresh page instead of dropping it.
						fragment.xOffset = this.context().x;
						this.writer.addFragment(fragment, true);
					}
				}
			}
		}
	}

	currentBlockToRepeatable(): ElementFragment {
		const unbreakableContext = this.context();
		const rep: ElementFragment = { items: [], height: 0, insertedOnPages: [] };

		for (const item of unbreakableContext.pages[0]?.items ?? []) {
			rep.items.push(item);
		}

		rep.xOffset = this.originalX;
		rep.pageMarginLeft =
			this.contextStack.at(-1)?.getCurrentPage()?.pageMargins.left ??
			unbreakableContext.requireCurrentPage().pageMargins.left;

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
	 * Moves the content to the next region of the innermost container flow, such as the next
	 * snaking column, and repeats the repeatable fragments (table headers) at the top of the region.
	 */
	enterNextFlowRegion(): void {
		const nextRegion = this.context().enterNextFlowRegion();

		this.repeatables.forEach(function (this: PageElementWriter, rep): void {
			// After a page break, headers keep their absolute x (`useBlockXOffset`), which works because
			// page margins are consistent. A new region starts at a different x, so headers are drawn
			// relative to the current x instead; otherwise they would land in the first region.
			this.addFragment(rep, false);
		}, this);

		this.emit("regionChanged", {
			prevY: nextRegion.prevY,
			y: this.context().y,
		});
	}

	_fitOnPage<T>(addFct: (allowOverflow?: boolean) => T | false): T | false {
		let position = addFct(false);
		if (!position) {
			if (this.context().canEnterNextFlowRegion()) {
				this.enterNextFlowRegion();
				position = addFct(false);
			}

			if (!position) {
				const ctx = this.context();

				if (ctx.getFlowSnapshot()) {
					if (ctx.isFlowInterruptedByNestedGroup()) {
						// Inside a nested column group (such as a table cell) within a flow: use a plain page
						// break. The flow is not restarted; the nested container handles its own breaks.
						this.moveToNextPage();
					} else {
						this.moveToNextPage();

						// Save lastColumnWidth before the restart: inside a nested column group, the restart
						// would overwrite it with the flow's region width and corrupt the inner layout.
						const savedLastColumnWidth = ctx.lastColumnWidth;
						ctx.restartFlowOnNewPage();
						ctx.lastColumnWidth = savedLastColumnWidth;
					}

					position = addFct(false);
				} else {
					while (ctx.snapshots.at(-1)?.overflowed) {
						const popped = ctx.snapshots.pop();
						const prevSnapshot = ctx.snapshots[ctx.snapshots.length - 1];
						if (prevSnapshot) {
							ctx.x = prevSnapshot.x;
							ctx.y = prevSnapshot.y;
							ctx.availableHeight = prevSnapshot.availableHeight;
							ctx.availableWidth = popped?.availableWidth ?? prevSnapshot.availableWidth;
							ctx.lastColumnWidth = prevSnapshot.lastColumnWidth;
						}
					}

					this.moveToNextPage();
					position = addFct(false);
				}
			}
		}
		if (!position) position = addFct(true);
		return position;
	}
}

export default PageElementWriter;
