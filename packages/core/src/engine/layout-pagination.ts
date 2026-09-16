import type PageElementWriter from "../layout/element-writer.page";
import type { PageOrientation } from "../types";

export interface VerticalPaginationContext {
	writer: PageElementWriter;
	moveAcrossSnakingPage(pageOrientation?: PageOrientation): void;
}

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

		if (
			context.writer.context().inSnakingColumns() &&
			!context.writer.context().isInNestedNonSnakingGroup()
		) {
			context.moveAcrossSnakingPage(pageOrientation);
		} else {
			context.writer.moveToNextPage(pageOrientation);
		}

		if (availableHeight <= 0 && context.writer.context().availableHeight <= 0) {
			throw new Error("Cannot apply vertical spacing on a page with no available height");
		}
	}

	context.writer.context().moveDown(remainingHeight);
}

export function moveToNextSnakingColumnOrPage(
	writer: PageElementWriter,
	pageOrientation?: PageOrientation,
): void {
	const context = writer.context();
	if (!context.getSnakingSnapshot()) return;

	if (writer.canMoveToNextColumn()) {
		writer.moveToNextColumn();
		return;
	}

	writer.moveToNextPage(pageOrientation);

	// A nested group needs its own last width after the outer snaking state is reset.
	const lastColumnWidth = context.lastColumnWidth;
	context.resetSnakingColumnsForNewPage();
	context.lastColumnWidth = lastColumnWidth;
}
