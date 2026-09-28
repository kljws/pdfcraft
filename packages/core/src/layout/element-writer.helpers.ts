import type {
	CurrentPosition,
	FeaturePageItem,
	LayoutPdfNode,
	PageItem,
	PdfPage,
} from "../types/internal";
import { getPageItemBottom } from "./page-item-geometry";
import type { NodePlaceContext } from "../engine/contracts/node-feature";

type FeatureItemLayoutWriter = {
	addFeatureItem(
		featureKind: FeaturePageItem["type"],
		node: LayoutPdfNode,
	): CurrentPosition | false | Array<CurrentPosition | undefined>;
};

export function layoutFeatureItem(
	featureKind: FeaturePageItem["type"],
	node: LayoutPdfNode,
	writer: FeatureItemLayoutWriter,
): void {
	const position = writer.addFeatureItem(featureKind, node);
	if (position && !Array.isArray(position)) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}

type PlacementContext = {
	readonly page: number;
	readonly availableHeight: number;
	readonly backgroundLength: readonly number[];
	getCurrentPage(): PdfPage | undefined;
};

/**
 * Returns the page on which an atomic item of `height` may be placed now, or `undefined` when the
 * writer should move on. An item that does not fit is still accepted when it is absolutely
 * positioned, when nothing but background items precede it on the page, or on the forced last
 * attempt; the item then overflows instead of being lost.
 */
export function findPlacementPage(
	node: LayoutPdfNode,
	height: number,
	context: PlacementContext,
	allowOverflow = false,
): PdfPage | undefined {
	const page = context.getCurrentPage();
	if (!page) return undefined;
	if (allowOverflow || node.absolutePosition !== undefined || context.availableHeight >= height) {
		return page;
	}
	const backgroundItems = context.backgroundLength[context.page] ?? 0;
	return page.items.length > backgroundItems ? undefined : page;
}

type AtomicPlacementOptions = {
	/** Aligns the item horizontally from its `_alignment` and `_minWidth`. Defaults to `true`. */
	align?: boolean | undefined;
	/**
	 * Runs once the item is accepted on the page and before it is positioned; returns the height
	 * that the cursor advances by. Feature-specific sizing belongs here.
	 */
	prepare?(area: { availableWidth: number; availableHeight: number }): number;
};

/**
 * Places an atomic feature item at the cursor: checks the page, positions and aligns the item,
 * inserts it and advances the cursor. Returns `false` when the writer should move on.
 */
export function placeAtomicItem(
	type: FeaturePageItem["type"],
	node: LayoutPdfNode,
	height: number,
	{ writer, index, allowOverflow }: NodePlaceContext,
	{ align = true, prepare }: AtomicPlacementOptions = {},
): CurrentPosition | false {
	const context = writer.context();
	const position = writer.getCurrentPositionOnPage();
	const page = findPlacementPage(node, height, context, allowOverflow);
	if (!page) return false;

	const placedHeight = prepare ? prepare(context) : height;
	node._x ??= node.x || 0;
	node.x = context.x + node._x;
	node.y = context.y;
	if (align) alignItem(node, context.availableWidth);
	addPageItem(page, { type, item: node }, index);
	context.moveDown(placedHeight);
	return position;
}

export function getAlignmentOffset(
	alignment: string | undefined,
	availableWidth: number,
	contentWidth: number,
): number {
	if (alignment === "right") {
		return availableWidth - contentWidth;
	}
	if (alignment === "center") {
		return (availableWidth - contentWidth) / 2;
	}
	return 0;
}

export function alignItem(item: LayoutPdfNode, availableWidth: number): void {
	const offset = getAlignmentOffset(item._alignment, availableWidth, item._minWidth ?? 0);
	if (offset) {
		item.x = (item.x || 0) + offset;
	}
}

export function addPageItem(page: PdfPage, item: PageItem, index?: number): void {
	if (index === null || index === undefined || index < 0 || index > page.items.length) {
		page.items.push(item);
	} else {
		page.items.splice(index, 0, item);
	}
}

export function getFragmentHeight(items: PageItem[], cursorY: number): number {
	return Math.max(cursorY, ...items.map(getPageItemBottom));
}
