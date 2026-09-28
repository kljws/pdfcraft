import type { LayoutPdfNode, PdfNode, PdfPage, Position } from "../../types/internal";
import type {
	PageBreakBefore,
	PageBreakBeforeContext,
	PageBreakNodeInfo,
} from "../../engine/page-break-before.types";

const nodeInfoKeys = [
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
			for (const key of nodeInfoKeys) {
				if (publicNode[key] !== undefined) nodeInfo[key] = publicNode[key];
			}
			context.copyExtensionProperties(node, nodeInfo);
			const [startPosition] = positions;
			if (!startPosition) continue;
			nodeInfo.startPosition = startPosition;
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

		for (const [index, node] of nodes.entries()) {
			if (node.pageBreak === "before" || node.pageBreakCalculated) continue;

			node.pageBreakCalculated = true;
			const nodeInfo = node.nodeInfo!;
			const pageNumber = nodeInfo.pageNumbers[0];
			// A node without a page number has no neighbours on a page.
			const getNodes = (
				start: number,
				end: number,
				targetPage: number | undefined,
			): PageBreakNodeInfo[] => {
				const result: PageBreakNodeInfo[] = [];
				if (targetPage === undefined) return result;
				for (const other of nodes.slice(start, end)) {
					const info = other.nodeInfo;
					if (!info) continue;
					if (info.pageNumbers.includes(targetPage)) result.push(info);
				}
				return result;
			};

			if (
				pageBreakBefore(nodeInfo, {
					getFollowingNodesOnPage: () => getNodes(index + 1, nodes.length, pageNumber),
					getNodesOnNextPage: () =>
						getNodes(
							index + 1,
							nodes.length,
							pageNumber === undefined ? undefined : pageNumber + 1,
						),
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
