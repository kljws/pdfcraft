import type PageElementWriter from "../layout/element-writer.page";
import type { PageOrientation } from "../types";

/**
 * Where content continues after `advanceFlowRegion`:
 * - `"page"`: at the top of the next page, with the horizontal geometry it had;
 * - `"region"`: in a region decided by an enclosing container flow (for example the next snaking
 *   column, possibly on a new page), whose width may differ, so line-based content is rebuilt.
 */
export type FlowAdvance = "page" | "region";

export type FlowAdvanceOptions = {
	/**
	 * Advances the enclosing flow even from inside a nested column group (a table row or a column
	 * row within the flow). By default such content takes a plain page break, so that the nested
	 * group's own regions stay side by side.
	 */
	throughNestedGroups?: boolean | undefined;
};

/** Continues the content in the next region of the flow it is laid out in, or on the next page. */
export function advanceFlowRegion(
	writer: PageElementWriter,
	pageOrientation?: PageOrientation,
	{ throughNestedGroups = false }: FlowAdvanceOptions = {},
): FlowAdvance {
	const context = writer.context();
	if (
		!context.getFlowSnapshot() ||
		(!throughNestedGroups && context.isFlowInterruptedByNestedGroup())
	) {
		writer.moveToNextPage(pageOrientation);
		return "page";
	}

	if (context.canEnterNextFlowRegion()) {
		writer.enterNextFlowRegion();
		return "region";
	}

	writer.moveToNextPage(pageOrientation);

	// A nested group needs its own last width after the flow restarts on the new page.
	const lastColumnWidth = context.lastColumnWidth;
	context.restartFlowOnNewPage();
	context.lastColumnWidth = lastColumnWidth;
	return "region";
}

export type VerticalPaginationContext = {
	writer: PageElementWriter;
	advanceFlowRegion(pageOrientation?: PageOrientation): FlowAdvance;
};

export function moveDownWithPageBreak(
	height: number,
	pageOrientation: PageOrientation | undefined,
	context: VerticalPaginationContext,
): void {
	let remainingHeight = Math.max(0, height);

	while (remainingHeight > context.writer.context().availableHeight) {
		const availableHeight = context.writer.context().availableHeight;
		if (availableHeight > 0) {
			context.writer.context().moveDown(availableHeight);
			remainingHeight -= availableHeight;
		}

		context.advanceFlowRegion(pageOrientation);

		if (availableHeight <= 0 && context.writer.context().availableHeight <= 0) {
			throw new Error("Cannot apply vertical spacing on a page with no available height");
		}
	}

	context.writer.context().moveDown(remainingHeight);
}
