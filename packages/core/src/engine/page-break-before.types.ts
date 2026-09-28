import type { LayoutPdfNode, NodeLayoutInfo } from "../types/internal";

export type PageBreakNodeInfo = NodeLayoutInfo;

export type PageBreakHelpers = {
	getFollowingNodesOnPage(): PageBreakNodeInfo[];
	getNodesOnNextPage(): PageBreakNodeInfo[];
	getPreviousNodesOnPage(): PageBreakNodeInfo[];
};

export type PageBreakBefore = (
	currentNode: PageBreakNodeInfo,
	helpers: PageBreakHelpers,
) => boolean;

export type PageBreakBeforeContext = {
	copyExtensionProperties(node: LayoutPdfNode, nodeInfo: PageBreakNodeInfo): void;
	/** Whether a parent feature draws a marker in front of the node, such as a list bullet. */
	hasLeadingMarker(node: LayoutPdfNode): boolean;
};
