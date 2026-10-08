import type { LayoutPdfNode, Metadata, Position } from "../types/internal";

/** Information about a laid-out node given to the user's `pageBreakBefore` callback. */
export type PageBreakNodeInfo = Metadata & {
	startPosition: Position;
	pageNumbers: number[];
	pages: number;
	stack: boolean;
};

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
	/** Public content keys copied to the node information, in order. */
	readonly contentKeys: readonly string[];
	copyExtensionProperties(node: LayoutPdfNode, nodeInfo: PageBreakNodeInfo): void;
	/** Whether the node draws nothing of its own, such as an empty text without a list marker. */
	isBlank(node: LayoutPdfNode): boolean;
	isStack(node: LayoutPdfNode): boolean;
};
