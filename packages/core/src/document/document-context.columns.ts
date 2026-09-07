import { bottomMostContext } from "./document-context.geometry";
import type {
	ColumnEndingCell,
	ContextSnapshot,
	DocumentContextState,
} from "./document-context.types";

/** Column division and vertical synchronization operations. */
export function beginColumnGroup(
	state: DocumentContextState,
	marginXTopParent: [number, number] | null = null,
	bottomByPage: Record<number, number> = {},
	snakingColumns = false,
	columnGap = 0,
	columnWidths: number[] | null = null,
): void {
	state.snapshots.push({
		x: state.x,
		y: state.y,
		availableHeight: state.availableHeight,
		availableWidth: state.availableWidth,
		page: state.page,
		bottomByPage: bottomByPage || {},
		bottomMost: {
			x: state.x,
			y: state.y,
			availableHeight: state.availableHeight,
			availableWidth: state.availableWidth,
			page: state.page,
		},
		lastColumnWidth: state.lastColumnWidth,
		snakingColumns,
		gap: columnGap,
		columnWidths,
	});

	state.lastColumnWidth = 0;
	if (marginXTopParent) state.marginXTopParent = marginXTopParent;
}

export function updateBottomByPage(state: DocumentContextState): void {
	const lastSnapshot = state.snapshots[state.snapshots.length - 1];
	if (!lastSnapshot) return;

	const previousBottom = lastSnapshot.bottomByPage[state.page] ?? -Number.MIN_VALUE;
	lastSnapshot.bottomByPage[state.page] = Math.max(previousBottom, state.y);
}

export function resetMarginXTopParent(state: DocumentContextState): void {
	state.marginXTopParent = null;
}

export function beginColumn(
	state: DocumentContextState,
	width: number = state.availableWidth,
	offset = 0,
	endingCell: ColumnEndingCell | null = null,
): void {
	let saved = state.snapshots[state.snapshots.length - 1];
	if (saved?.overflowed) {
		for (let index = state.snapshots.length - 1; index >= 0; index--) {
			if (!state.snapshots[index].overflowed) {
				saved = state.snapshots[index];
				break;
			}
		}
	}

	calculateBottomMost(state, saved, endingCell);

	state.page = saved.page;
	state.pageMargins = state.pages[state.page]?.pageMargins ?? state.pageMargins;
	state.x += state.lastColumnWidth + offset;
	state.y = saved.y;
	state.availableWidth = width;
	state.availableHeight = saved.availableHeight;
	state.lastColumnWidth = width;
}

export function calculateBottomMost(
	state: DocumentContextState,
	destination: ContextSnapshot,
	endingCell: ColumnEndingCell | null,
): void {
	if (endingCell) {
		saveContextInEndingCell(state, endingCell);
	} else {
		destination.bottomMost = bottomMostContext(state, destination.bottomMost);
	}
}

export function markEnding(
	state: DocumentContextState,
	endingCell: ColumnEndingCell,
	originalXOffset = 0,
	discountY = 0,
): void {
	const endingContext = endingCell._columnEndingContext;
	if (!endingContext) throw new Error("Column ending context is missing");

	state.page = endingContext.page;
	state.pageMargins = state.pages[state.page]?.pageMargins ?? state.pageMargins;
	state.x = endingContext.x + originalXOffset;
	state.y = endingContext.y - discountY;
	state.availableWidth = endingContext.availableWidth;
	state.availableHeight = endingContext.availableHeight;
	state.lastColumnWidth = endingContext.lastColumnWidth ?? state.lastColumnWidth;
}

export function saveContextInEndingCell(
	state: DocumentContextState,
	endingCell: ColumnEndingCell,
): void {
	endingCell._columnEndingContext = {
		page: state.page,
		x: state.x,
		y: state.y,
		availableHeight: state.availableHeight,
		availableWidth: state.availableWidth,
		lastColumnWidth: state.lastColumnWidth,
	};
}

export function completeColumnGroup(
	state: DocumentContextState,
	height = 0,
	endingCell: ColumnEndingCell | null | undefined = null,
): Record<number, number> {
	let saved = state.snapshots.pop();
	if (!saved) return {};

	let maxBottomY = state.y;
	let maxBottomPage = state.page;
	let maxBottomAvailableHeight = state.availableHeight;
	const overflowed = saved.overflowed;

	while (saved?.overflowed) {
		const bottom = bottomMostContext(
			{
				x: state.x,
				page: maxBottomPage,
				y: maxBottomY,
				availableHeight: maxBottomAvailableHeight,
				availableWidth: state.availableWidth,
			},
			saved.bottomMost,
		);
		maxBottomPage = bottom.page;
		maxBottomY = bottom.y;
		maxBottomAvailableHeight = bottom.availableHeight;
		saved = state.snapshots.pop();
	}

	if (!saved) return {};

	if (
		overflowed &&
		(maxBottomPage > saved.bottomMost.page ||
			(maxBottomPage === saved.bottomMost.page && maxBottomY > saved.bottomMost.y))
	) {
		saved.bottomMost = {
			x: saved.x,
			y: maxBottomY,
			page: maxBottomPage,
			availableHeight: maxBottomAvailableHeight,
			availableWidth: saved.availableWidth,
		};
	}

	calculateBottomMost(state, saved, endingCell ?? null);
	state.x = saved.x;

	let y = saved.bottomMost.y;
	if (height) {
		if (saved.page === saved.bottomMost.page) {
			if (saved.y + height > y) y = saved.y + height;
		} else {
			y += height;
		}
	}

	state.y = y;
	state.page = saved.bottomMost.page;
	state.pageMargins = state.pages[state.page]?.pageMargins ?? state.pageMargins;
	state.availableWidth = saved.availableWidth;
	state.availableHeight = saved.bottomMost.availableHeight;
	if (height) state.availableHeight -= y - saved.bottomMost.y;

	state.height =
		height && saved.bottomMost.y - saved.y < height ? height : saved.bottomMost.y - saved.y;
	state.lastColumnWidth = saved.lastColumnWidth;
	return saved.bottomByPage;
}
