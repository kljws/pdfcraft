import type { LayoutCanvasNode } from "./canvas.types";

export function decorateCanvas(node: LayoutCanvasNode): void {
	for (const vector of node.canvas ?? []) {
		const position = {
			x: vector.x,
			y: vector.y,
			x1: vector.x1,
			y1: vector.y1,
			x2: vector.x2,
			y2: vector.y2,
		};
		vector.resetXY = () => Object.assign(vector, position);
	}
}

export function resetCanvas(node: LayoutCanvasNode): void {
	for (const vector of node.canvas ?? []) vector.resetXY?.();
}
