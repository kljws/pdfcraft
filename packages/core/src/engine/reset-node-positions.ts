import type { LayoutPdfNode } from "../types/internal";

export function resetNodePositions(nodes: LayoutPdfNode[]): void {
	for (const node of nodes) {
		node.resetXY?.();
	}
}
