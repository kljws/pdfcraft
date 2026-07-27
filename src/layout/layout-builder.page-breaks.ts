import type { LayoutPdfNode, PdfPage, Position } from "../types/internal";
import type { LayoutResult, PageBreakBefore, PageBreakNodeInfo } from "./layout-builder.types";

const NODE_INFO_KEYS = [
	"id",
	"text",
	"ul",
	"ol",
	"table",
	"image",
	"qr",
	"canvas",
	"svg",
	"columns",
	"headlineLevel",
	"style",
	"pageBreak",
	"pageOrientation",
	"width",
	"height",
] as const;

export function addPageBreaksIfNecessary(
	linearNodeList: LayoutPdfNode[],
	pages: PdfPage[],
	pageBreakBefore?: PageBreakBefore,
): boolean {
	if (!pageBreakBefore) return false;

	const nodes = linearNodeList.filter(
		(node) => Boolean(node.positions?.length) && (node.text !== "" || Boolean(node.listMarker)),
	);
	for (const node of nodes) {
		const positions = node.positions;
		if (!positions?.length) continue;
		const nodeInfo = {} as PageBreakNodeInfo;
		for (const key of NODE_INFO_KEYS) {
			if (node[key] !== undefined) nodeInfo[key] = node[key];
		}
		nodeInfo.startPosition = positions[0];
		nodeInfo.pageNumbers = Array.from(
			new Set(
				positions
					.map((position: Position) => position.pageNumber)
					.filter((pageNumber): pageNumber is number => pageNumber !== undefined),
			),
		);
		nodeInfo.pages = pages.length;
		nodeInfo.stack = Array.isArray(node.stack);
		node.nodeInfo = nodeInfo;
	}

	for (let index = 0; index < nodes.length; index++) {
		const node = nodes[index];
		if (node.pageBreak === "before" || node.pageBreakCalculated) continue;

		node.pageBreakCalculated = true;
		const nodeInfo = node.nodeInfo;
		if (!nodeInfo) continue;
		const pageNumber = nodeInfo.pageNumbers[0];
		const getNodes = (start: number, end: number, targetPage: number): PageBreakNodeInfo[] => {
			const result: PageBreakNodeInfo[] = [];
			for (let nodeIndex = start; nodeIndex < end; nodeIndex++) {
				const info = nodes[nodeIndex].nodeInfo;
				if (!info) continue;
				if (info.pageNumbers.includes(targetPage)) result.push(info);
			}
			return result;
		};

		if (
			pageBreakBefore(nodeInfo, {
				getFollowingNodesOnPage: () => getNodes(index + 1, nodes.length, pageNumber),
				getNodesOnNextPage: () => getNodes(index + 1, nodes.length, pageNumber + 1),
				getPreviousNodesOnPage: () => getNodes(0, index, pageNumber),
			})
		) {
			node.pageBreak = "before";
			return true;
		}
	}

	return false;
}

export function resetNodePositions(result: LayoutResult): void {
	for (const node of result.linearNodeList) {
		node.resetXY?.();
	}
}
