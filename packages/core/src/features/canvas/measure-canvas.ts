import type StyleContextStack from "../../services/styles/style-context-stack";
import type { Alignment } from "../../types";
import type { MeasuredPdfNode } from "../../types/internal";
import { getCanvasPathBounds } from "../../utils/canvas-path-bounds";

export function measureCanvas(node: MeasuredPdfNode, styles: StyleContextStack): MeasuredPdfNode {
	let width = 0;
	let height = 0;

	for (const vector of node.canvas ?? []) {
		switch (vector.type) {
			case "ellipse":
				width = Math.max(width, (vector.x ?? 0) + (vector.r1 ?? 0));
				height = Math.max(height, (vector.y ?? 0) + (vector.r2 ?? 0));
				break;
			case "rect":
				width = Math.max(width, (vector.x ?? 0) + (vector.w ?? 0));
				height = Math.max(height, (vector.y ?? 0) + (vector.h ?? 0));
				break;
			case "line":
				width = Math.max(width, vector.x1 ?? 0, vector.x2 ?? 0);
				height = Math.max(height, vector.y1 ?? 0, vector.y2 ?? 0);
				break;
			case "polyline":
				for (const point of vector.points ?? []) {
					width = Math.max(width, point.x);
					height = Math.max(height, point.y);
				}
				break;
			case "path": {
				const bounds = getCanvasPathBounds(vector.d);
				if (bounds) {
					width = Math.max(width, (vector.x ?? 0) + bounds.maxX);
					height = Math.max(height, (vector.y ?? 0) + bounds.maxY);
				}
				break;
			}
		}
	}

	node._minWidth = node._maxWidth = width;
	node._minHeight = node._maxHeight = height;
	node._alignment = styles.getProperty("alignment") as Alignment | undefined;
	return node;
}
