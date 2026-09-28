/** `T` without properties whose value is `undefined`: those keys become optional and defined. */
export type WithoutUndefined<T> = {
	[K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
	[K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

/** `T` whose properties also accept `undefined`, the shape PDFCraft accepts from callers. */
export type AllowUndefined<T> = { [K in keyof T]: T[K] | undefined };

/**
 * Copies `value` without its `undefined` properties. PDFCraft treats an `undefined` property as
 * absent; external APIs such as PDFKit type their options without `undefined`.
 */
export function withoutUndefined<T extends object>(value: T): WithoutUndefined<T> {
	return Object.fromEntries(
		Object.entries(value).filter(([, property]) => property !== undefined),
	) as WithoutUndefined<T>;
}
