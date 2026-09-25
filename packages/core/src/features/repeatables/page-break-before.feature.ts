import type { LayoutPdfNode, PdfNode, PdfPage, Position } from "../../types/internal";
import type {
	PageBreakBefore,
	PageBreakBeforeContext,
	PageBreakNodeInfo,
} from "../../engine/page-break-before.types";

const NODE_INFO_KEYS = [
	"id",
	"text",
	"ul",
	"ol",
	"table",
	"image",
	"canvas",
	"columns",
	"headlineLevel",
	"style",
	"pageBreak",
	"pageOrientation",
	"width",
	"height",
] as const;

export const pageBreakBeforeFeature = {
	addIfNecessary(
		linearNodeList: LayoutPdfNode[],
		pages: PdfPage[],
		pageBreakBefore: PageBreakBefore | undefined,
		context: PageBreakBeforeContext,
	): boolean {
		if (!pageBreakBefore) return false;

		const nodes = linearNodeList.filter(
			(node) =>
				Boolean(node.positions?.length) &&
				(node._kind !== "text" || node.text !== "" || context.hasLeadingMarker(node)),
		);
		for (const node of nodes) {
			const positions = node.positions!;
			const publicNode = node as PdfNode;
			const nodeInfo = {} as PageBreakNodeInfo;
			for (const key of NODE_INFO_KEYS) {
				if (publicNode[key] !== undefined) nodeInfo[key] = publicNode[key];
			}
			context.copyExtensionProperties(node, nodeInfo);
			nodeInfo.startPosition = positions[0];
			nodeInfo.pageNumbers = Array.from(
				new Set(
					positions
						.map((position: Position) => position.pageNumber)
						.filter(
							(pageNumber: number | undefined): pageNumber is number => pageNumber !== undefined,
						),
				),
			);
			nodeInfo.pages = pages.length;
			nodeInfo.stack = node._kind === "stack";
			node.nodeInfo = nodeInfo;
		}

		for (let index = 0; index < nodes.length; index++) {
			const node = nodes[index];
			if (node.pageBreak === "before" || node.pageBreakCalculated) continue;

			node.pageBreakCalculated = true;
			const nodeInfo = node.nodeInfo!;
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
	},
};
