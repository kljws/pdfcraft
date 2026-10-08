import type DocumentContext from "./document-context";
import { findFlowSnapshot, hasNestedGroupInFlow } from "./document-context.helpers";
import { updateBottomMost } from "./document-context.columns";
import type { ContextSnapshot } from "./document-context.types";

/**
 * Region bookkeeping of container flows. The container that opens a flow decides the geometry of
 * its regions (`FlowRegions`); these operations keep the cursor and the region snapshots.
 */

/** Number of further regions entered since the flow's first region on the current page. */
function countEnteredRegions(context: DocumentContext): number {
	let count = 0;
	for (let index = context.snapshots.length - 1; index >= 0; index--) {
		if (!context.snapshots[index]?.overflowed) break;
		count++;
	}
	return count;
}

export function getFlowSnapshot(context: DocumentContext): ContextSnapshot | null {
	return findFlowSnapshot(context.snapshots);
}

export function isFlowInterruptedByNestedGroup(context: DocumentContext): boolean {
	return hasNestedGroupInFlow(context.snapshots);
}

/**
 * Whether the content can continue in another region of the innermost flow on the current page.
 * A column group opened inside the flow (for example a table row) keeps its content on the page
 * flow instead, so that its own regions stay side by side.
 */
export function canEnterNextFlowRegion(context: DocumentContext): boolean {
	const flowSnapshot = getFlowSnapshot(context);
	if (!flowSnapshot?.flow || isFlowInterruptedByNestedGroup(context)) return false;
	return flowSnapshot.flow.hasNextRegion(context, countEnteredRegions(context));
}

export function enterNextFlowRegion(context: DocumentContext): { prevY: number; y: number } {
	const prevY = context.y;
	const flowSnapshot = getFlowSnapshot(context);
	if (!flowSnapshot?.flow) {
		return { prevY, y: context.y };
	}

	updateBottomMost(context, flowSnapshot);
	const region = flowSnapshot.flow.nextRegion(context, countEnteredRegions(context));
	const newY = flowSnapshot.y;

	context.lastColumnWidth = region.width;
	context.snapshots.push({
		x: region.x,
		y: newY,
		availableHeight: flowSnapshot.availableHeight,
		availableWidth: region.width,
		page: context.page,
		overflowed: true,
		bottomMost: {
			x: region.x,
			y: newY,
			availableHeight: flowSnapshot.availableHeight,
			availableWidth: region.width,
			page: context.page,
		},
		lastColumnWidth: region.width,
		flow: flowSnapshot.flow,
		bottomByPage: {},
	});

	context.x = region.x;
	context.y = newY;
	context.availableHeight = flowSnapshot.availableHeight;
	context.availableWidth = region.width;

	for (let index = context.snapshots.length - 2; index >= 0; index--) {
		const snapshot = context.snapshots[index];
		if (!snapshot || snapshot.overflowed || snapshot.flow) break;
		snapshot.x = region.x;
		snapshot.y = newY;
		snapshot.page = context.page;
		snapshot.availableHeight = flowSnapshot.availableHeight;
		if (snapshot.bottomMost) {
			snapshot.bottomMost.x = region.x;
			snapshot.bottomMost.y = newY;
			snapshot.bottomMost.page = context.page;
			snapshot.bottomMost.availableHeight = flowSnapshot.availableHeight;
		}
	}

	return { prevY, y: context.y };
}

/** Moves the cursor and the open snapshots to the first region of the flow on a new page. */
export function restartFlowOnNewPage(context: DocumentContext): void {
	const flowSnapshot = getFlowSnapshot(context);
	if (!flowSnapshot?.flow) return;

	const pageTopY = context.pageMargins.top;
	const pageInnerHeight =
		context.requireCurrentPage().pageSize.height -
		context.pageMargins.top -
		context.pageMargins.bottom;
	const firstRegion = flowSnapshot.flow.firstRegion(context);

	while (context.snapshots.length > 1 && context.snapshots.at(-1)?.overflowed) {
		context.snapshots.pop();
	}

	context.x = firstRegion.x;
	context.availableWidth = firstRegion.width;
	context.lastColumnWidth = firstRegion.width;

	for (const snapshot of context.snapshots) {
		const isFlowSnapshot = Boolean(snapshot.flow);
		snapshot.x = context.x;
		snapshot.y = isFlowSnapshot ? pageTopY : context.y;
		snapshot.availableHeight = isFlowSnapshot ? pageInnerHeight : context.availableHeight;
		snapshot.page = context.page;
		if (snapshot.bottomMost) {
			snapshot.bottomMost.x = context.x;
			snapshot.bottomMost.y = isFlowSnapshot ? pageTopY : context.y;
			snapshot.bottomMost.availableHeight = isFlowSnapshot
				? pageInnerHeight
				: context.availableHeight;
			snapshot.bottomMost.page = context.page;
		}
	}
}
