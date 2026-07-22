import type { PdfPage } from "../types/internal";
import { findSnakingSnapshot, hasNestedNonSnakingGroup } from "./document-context.helpers";
import type {
	ColumnEndingCell,
	ContextSnapshot,
	DocumentContextState,
} from "./document-context.types";

type CalculateBottomMost = (
	destination: ContextSnapshot,
	endingCell: ColumnEndingCell | null,
) => void;

export function getSnakingSnapshot(state: DocumentContextState): ContextSnapshot | null {
	return findSnakingSnapshot(state.snapshots);
}

export function inSnakingColumns(state: DocumentContextState): boolean {
	return getSnakingSnapshot(state) !== null;
}

export function isInNestedNonSnakingGroup(state: DocumentContextState): boolean {
	return hasNestedNonSnakingGroup(state.snapshots);
}

export function moveToNextColumn(
	state: DocumentContextState,
	calculateBottomMost: CalculateBottomMost,
): { prevY: number; y: number } {
	const prevY = state.y;
	const snakingSnapshot = getSnakingSnapshot(state);
	if (!snakingSnapshot) {
		return { prevY, y: state.y };
	}

	calculateBottomMost(snakingSnapshot, null);
	let overflowCount = 0;
	for (let index = state.snapshots.length - 1; index >= 0; index--) {
		if (!state.snapshots[index].overflowed) break;
		overflowCount++;
	}

	const currentColumnWidth =
		snakingSnapshot.columnWidths?.[overflowCount] || state.lastColumnWidth || state.availableWidth;
	const nextColumnWidth = snakingSnapshot.columnWidths?.[overflowCount + 1] || currentColumnWidth;
	const newX = state.x + currentColumnWidth + (snakingSnapshot.gap || 0);
	const newY = snakingSnapshot.y;

	state.lastColumnWidth = nextColumnWidth;
	state.snapshots.push({
		x: newX,
		y: newY,
		availableHeight: snakingSnapshot.availableHeight,
		availableWidth: nextColumnWidth,
		page: state.page,
		overflowed: true,
		bottomMost: {
			x: newX,
			y: newY,
			availableHeight: snakingSnapshot.availableHeight,
			availableWidth: nextColumnWidth,
			page: state.page,
		},
		lastColumnWidth: nextColumnWidth,
		snakingColumns: true,
		gap: snakingSnapshot.gap,
		columnWidths: snakingSnapshot.columnWidths,
		bottomByPage: {},
	});

	state.x = newX;
	state.y = newY;
	state.availableHeight = snakingSnapshot.availableHeight;
	state.availableWidth = nextColumnWidth;

	for (let index = state.snapshots.length - 2; index >= 0; index--) {
		const snapshot = state.snapshots[index];
		if (snapshot.overflowed || snapshot.snakingColumns) break;
		snapshot.x = newX;
		snapshot.y = newY;
		snapshot.page = state.page;
		snapshot.availableHeight = snakingSnapshot.availableHeight;
		if (snapshot.bottomMost) {
			snapshot.bottomMost.x = newX;
			snapshot.bottomMost.y = newY;
			snapshot.bottomMost.page = state.page;
			snapshot.bottomMost.availableHeight = snakingSnapshot.availableHeight;
		}
	}

	return { prevY, y: state.y };
}

export function resetSnakingColumnsForNewPage(
	state: DocumentContextState,
	getCurrentPage: () => PdfPage,
): void {
	const snakingSnapshot = getSnakingSnapshot(state);
	if (!snakingSnapshot) return;

	const pageTopY = state.pageMargins.top;
	const pageInnerHeight =
		getCurrentPage().pageSize.height - state.pageMargins.top - state.pageMargins.bottom;
	const firstColumnWidth =
		snakingSnapshot.columnWidths?.[0] || state.lastColumnWidth || state.availableWidth;

	while (state.snapshots.length > 1 && state.snapshots.at(-1)?.overflowed) {
		state.snapshots.pop();
	}

	state.x = state.marginXTopParent
		? state.pageMargins.left + state.marginXTopParent[0]
		: state.pageMargins.left;
	state.availableWidth = firstColumnWidth;
	state.lastColumnWidth = firstColumnWidth;

	for (const snapshot of state.snapshots) {
		const isSnakingSnapshot = Boolean(snapshot.snakingColumns);
		snapshot.x = state.x;
		snapshot.y = isSnakingSnapshot ? pageTopY : state.y;
		snapshot.availableHeight = isSnakingSnapshot ? pageInnerHeight : state.availableHeight;
		snapshot.page = state.page;
		if (snapshot.bottomMost) {
			snapshot.bottomMost.x = state.x;
			snapshot.bottomMost.y = isSnakingSnapshot ? pageTopY : state.y;
			snapshot.bottomMost.availableHeight = isSnakingSnapshot
				? pageInnerHeight
				: state.availableHeight;
			snapshot.bottomMost.page = state.page;
		}
	}
}
