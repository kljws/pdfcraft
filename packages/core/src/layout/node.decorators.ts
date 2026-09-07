import type { LayoutPdfNode, Vector } from "../types/internal";

export function decorateNode(node: LayoutPdfNode): void {
	const x = node.x;
	const y = node.y;
	node.positions = [];

	if (Array.isArray(node.canvas)) {
		node.canvas.forEach((vector: Vector) => {
			const vectorPosition = {
				x: vector.x,
				y: vector.y,
				x1: vector.x1,
				y1: vector.y1,
				x2: vector.x2,
				y2: vector.y2,
			};
			vector.resetXY = () => Object.assign(vector, vectorPosition);
		});
	}

	node.resetXY = () => {
		node.x = x;
		node.y = y;
		if (Array.isArray(node.canvas)) {
			node.canvas.forEach((vector: Vector) => vector.resetXY?.());
		}
	};
}
