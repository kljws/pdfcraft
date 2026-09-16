import type { LayoutPdfNode, NodeLayoutInfo } from "../types/internal";

export type PageBreakNodeInfo = NodeLayoutInfo;

export interface PageBreakHelpers {
	getFollowingNodesOnPage(): PageBreakNodeInfo[];
	getNodesOnNextPage(): PageBreakNodeInfo[];
	getPreviousNodesOnPage(): PageBreakNodeInfo[];
}

export type PageBreakBefore = (
	currentNode: PageBreakNodeInfo,
	helpers: PageBreakHelpers,
) => boolean;

export interface PageBreakBeforeContext {
	copyExtensionProperties(node: LayoutPdfNode, nodeInfo: PageBreakNodeInfo): void;
}
