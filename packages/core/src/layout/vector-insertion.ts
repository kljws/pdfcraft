import type { PageItem, PdfPage, Vector } from "../types/internal";

type VectorPageItem = Extract<PageItem, { type: "vector" }>;
type VectorInsertionListener = (pageIndex: number, page: PdfPage, pageItem: VectorPageItem) => void;

const vectorInsertionListener = Symbol("vectorInsertionListener");

type TrackedVector = Vector & {
	[vectorInsertionListener]?: VectorInsertionListener;
};

export const trackVectorInsertion = (vector: Vector, listener: VectorInsertionListener): void => {
	Object.defineProperty(vector, vectorInsertionListener, {
		value: listener,
		enumerable: true,
		configurable: true,
	});
};

export const notifyVectorInsertion = (
	vector: Vector,
	pageIndex: number,
	page: PdfPage,
	pageItem: VectorPageItem,
): void => {
	(vector as TrackedVector)[vectorInsertionListener]?.(pageIndex, page, pageItem);
};
