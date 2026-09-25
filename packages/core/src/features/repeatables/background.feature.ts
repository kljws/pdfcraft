import type { PageSize } from "../../types/internal";
import type { BackgroundGetter, BackgroundLayoutContext } from "./background.types";

export const backgroundFeature = {
	layout(background: unknown, context: BackgroundLayoutContext): boolean {
		const dynamicBackgroundUsesPageCount =
			typeof background === "function" && background.length >= 3;
		const getBackground: BackgroundGetter =
			typeof background === "function" ? (background as BackgroundGetter) : () => background;

		// Three-argument backgrounds run during iterative layout, so pageCount is the
		// current pass estimate. Returning content marks the pass as page-count-dependent
		// and makes the document layout pipeline rerun it when the actual count changes.
		const pageBackground =
			typeof background === "function" && background.length === 2
				? (getBackground as (pageNumber: number, pageSize: PageSize) => unknown)(
						context.pageNumber,
						context.pageSize,
					)
				: (getBackground as (pageNumber: number, pageCount: number, pageSize: PageSize) => unknown)(
						context.pageNumber,
						context.pageCount,
						context.pageSize,
					);
		if (!pageBackground) return dynamicBackgroundUsesPageCount;

		context.beginUnbreakableBlock(context.pageSize.width, context.pageSize.height);
		const processed = context.preprocessNode(pageBackground);
		const layoutNode = context.measureNode(processed);
		context.layoutNode(layoutNode);
		context.commitUnbreakableBlock(0, 0);
		context.recordBackgroundItems(layoutNode.positions?.length ?? 0);
		return dynamicBackgroundUsesPageCount;
	},
};
