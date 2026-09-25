import type { NodePlaceContext } from "../../engine/contracts/node-feature";
import { getAlignmentOffset } from "../../layout/element-writer.helpers";
import type { CurrentPosition } from "../../types/internal";
import { offsetVector } from "../../utils/tools";
import type { LayoutCanvasNode } from "./canvas.types";

export function alignCanvas(node: LayoutCanvasNode, availableWidth: number): void {
	const offset = getAlignmentOffset(node._alignment, availableWidth, node._minWidth ?? 0);
	if (offset) {
		node.canvas?.forEach((vector) => offsetVector(vector, offset, 0));
	}
}

export function placeCanvasItem(
	node: LayoutCanvasNode,
	{ writer, index: initialIndex }: NodePlaceContext,
): false | Array<CurrentPosition | undefined> {
	let index = initialIndex;
	const context = writer.context();
	const page = context.getCurrentPage();
	const height = node._minHeight ?? 0;

	if (
		!page ||
		(node.absolutePosition === undefined &&
			context.availableHeight < height &&
			page.items.length > 0)
	) {
		return false;
	}

	alignCanvas(node, context.availableWidth);
	const positions: Array<CurrentPosition | undefined> = [];
	for (const vector of node.canvas ?? []) {
		positions.push(writer.addVector(vector, false, false, index));
		if (index !== undefined) index++;
	}
	context.moveDown(height);
	return positions;
}
