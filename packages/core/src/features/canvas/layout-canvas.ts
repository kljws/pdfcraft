import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutCanvasNode } from "./canvas.types";

export interface CanvasLayoutContext {
	writer: Pick<PageElementWriter, "addFeatureItem">;
}

export function layoutCanvas(node: LayoutCanvasNode, context: CanvasLayoutContext): void {
	const positions = context.writer.addFeatureItem("canvas", node);
	if (Array.isArray(positions)) {
		node.positions ??= [];
		node.positions.push(...positions.filter((position) => position !== undefined));
		for (let index = 0; index < (node.canvas?.length ?? 0); index++) {
			node.canvas![index]._position = positions[index];
		}
	}
	for (const vector of node.canvas ?? []) vector._node = node;
}
