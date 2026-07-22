import type { DocumentDefinition } from "../types";

const cloneRecursive = <T>(value: T, seen: WeakMap<object, object>): T => {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (value instanceof Date || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
		return value;
	}
	const existing = seen.get(value);
	if (existing) {
		return existing as T;
	}
	if (Array.isArray(value)) {
		const clone: unknown[] = [];
		seen.set(value, clone);
		for (const item of value) {
			clone.push(cloneRecursive(item, seen));
		}
		return clone as T;
	}
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) {
		return value;
	}
	const clone: Record<PropertyKey, unknown> = {};
	seen.set(value, clone);
	for (const key of Reflect.ownKeys(value)) {
		clone[key] = cloneRecursive((value as Record<PropertyKey, unknown>)[key], seen);
	}
	return clone as T;
};

export const cloneValue = <T>(value: T): T => cloneRecursive(value, new WeakMap());

export const cloneDocumentDefinition = (definition: DocumentDefinition): DocumentDefinition =>
	cloneValue(definition);
