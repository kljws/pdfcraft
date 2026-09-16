import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutPdfNode } from "../../types/internal";

export interface CanvasLayoutContext {
	writer: Pick<PageElementWriter, "addCanvas">;
}

export function layoutCanvas(node: LayoutPdfNode, context: CanvasLayoutContext): void {
	const positions = context.writer.addCanvas(node);
	if (positions) {
		node.positions ??= [];
		node.positions.push(...positions.filter((position) => position !== undefined));
		for (let index = 0; index < (node.canvas?.length ?? 0); index++) {
			node.canvas![index]._position = positions[index];
		}
	}
	for (const vector of node.canvas ?? []) vector._node = node;
}
