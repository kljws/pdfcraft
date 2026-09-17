import type DocumentContext from "../../document/document-context";
import { getAlignmentOffset } from "../../layout/element-writer.helpers";
import type { CurrentPosition, Vector } from "../../types/internal";
import { offsetVector } from "../../utils/tools";
import type { LayoutCanvasNode } from "./canvas.types";

export interface CanvasWriter {
	context(): DocumentContext;
	addVector(
		vector: Vector,
		ignoreContextX?: boolean,
		ignoreContextY?: boolean,
		index?: number,
		forcePage?: number,
	): CurrentPosition | undefined;
}

export function alignCanvas(node: LayoutCanvasNode, availableWidth: number): void {
	const offset = getAlignmentOffset(node._alignment, availableWidth, node._minWidth ?? 0);
	if (offset) {
		node.canvas?.forEach((vector) => offsetVector(vector, offset, 0));
	}
}

export function placeCanvas(
	writer: CanvasWriter,
	node: LayoutCanvasNode,
	index?: number,
): false | Array<CurrentPosition | undefined> {
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
