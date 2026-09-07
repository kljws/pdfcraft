import type { Vector } from "../types/internal";
import { cloneValue } from "./clone-document-definition";

export function pack<T extends object>(...args: Array<Partial<T> | null | undefined>): T {
	const result = {} as T;

	for (const object of args) {
		if (object) {
			Object.assign(result, object);
		}
	}

	return result;
}

export function offsetVector(vector: Vector, x: number, y: number): void {
	switch (vector.type) {
		case "ellipse":
		case "rect":
			vector.x = (vector.x ?? 0) + x;
			vector.y = (vector.y ?? 0) + y;
			break;
		case "line":
			vector.x1 = (vector.x1 ?? 0) + x;
			vector.x2 = (vector.x2 ?? 0) + x;
			vector.y1 = (vector.y1 ?? 0) + y;
			vector.y2 = (vector.y2 ?? 0) + y;
			break;
		case "polyline":
			for (const point of vector.points ?? []) {
				point.x += x;
				point.y += y;
			}
			break;
		case "path":
			vector.x = (vector.x ?? 0) + x;
			vector.y = (vector.y ?? 0) + y;
			break;
	}
}

export function convertToDynamicContent<T>(staticContent: T): () => T {
	return () => cloneValue(staticContent);
}
