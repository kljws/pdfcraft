import type DocumentContext from "../document/document-context";
import type {
	LayoutPdfNode,
	LineLike,
	PageItem,
	Position,
	Vector,
	VectorPageItem,
} from "../types/internal";
import { offsetVector, pack } from "../utils/tools";
import { notifyVectorInsertion } from "./vector-insertion";

export type ElementFragment = {
	height: number;
	xOffset?: number | undefined;
	yOffset?: number | undefined;
	items: PageItem[];
};

export function replayFragment(
	writer: { context(): DocumentContext },
	block: ElementFragment,
	useBlockXOffset: boolean | undefined,
	useBlockYOffset: boolean | undefined,
	dontUpdateContextPosition: boolean | undefined,
): boolean {
	const ctx = writer.context();
	const page = ctx.requireCurrentPage();

	if (!useBlockXOffset && block.height > ctx.availableHeight) {
		return false;
	}

	block.items.forEach((item) => {
		switch (item.type) {
			case "line":
				var l = (item.item as LineLike).clone();

				updateNodePageNumbers(l, ctx.page + 1);
				l.x = (l.x || 0) + (useBlockXOffset ? block.xOffset || 0 : ctx.x);
				l.y = (l.y || 0) + (useBlockYOffset ? block.yOffset || 0 : ctx.y);

				page.items.push({
					type: "line",
					item: l,
				});
				break;

			case "vector": {
				const v = pack(item.item as Vector) as Vector & {
					_isFillColorFromUnbreakable?: boolean | undefined;
				};
				updateNodePageNumbers(v, ctx.page + 1);

				offsetVector(
					v,
					useBlockXOffset ? block.xOffset || 0 : ctx.x,
					useBlockYOffset ? block.yOffset || 0 : ctx.y,
				);
				const pageItem: VectorPageItem = {
					type: "vector",
					item: v,
				};
				if (v._isFillColorFromUnbreakable) {
					// If the item is a fillColor from an unbreakable block
					// We have to add it at the beginning of the items body array of the page
					delete v._isFillColorFromUnbreakable;
					const endOfBackgroundItemsIndex = ctx.backgroundLength[ctx.page] ?? 0;
					page.items.splice(endOfBackgroundItemsIndex, 0, pageItem);
				} else {
					page.items.push(pageItem);
				}
				notifyVectorInsertion(v, ctx.page, page, pageItem);
				break;
			}

			case "beginClip":
			case "beginVerticalAlignment":
			case "endVerticalAlignment": {
				const control = { ...item.item };
				control.x = (control.x || 0) + (useBlockXOffset ? block.xOffset || 0 : ctx.x);
				control.y = (control.y || 0) + (useBlockYOffset ? block.yOffset || 0 : ctx.y);
				page.items.push({ type: item.type, item: control });
				break;
			}
			case "endClip":
				page.items.push(item);
				break;
			default: {
				const node = pack<LayoutPdfNode>(item.item) as LayoutPdfNode;
				updateNodePageNumbers(node, ctx.page + 1);

				node.x = (node.x || 0) + (useBlockXOffset ? block.xOffset || 0 : ctx.x);
				node.y = (node.y || 0) + (useBlockYOffset ? block.yOffset || 0 : ctx.y);

				page.items.push({ type: item.type, item: node });
				break;
			}
		}
	});

	if (!dontUpdateContextPosition) {
		ctx.moveDown(block.height);
	}

	return true;
}

function updateNodePageNumbers(
	item: { _node?: LayoutPdfNode | undefined; _position?: Position | undefined },
	pageNumber: number,
): void {
	if (item._position) {
		item._position.pageNumber = pageNumber;
		return;
	}

	// Compatibility for fragments created outside LayoutBuilder, where only a
	// single position was historically associated with the rendered item.
	const positions = item._node?.positions;
	if (positions?.length === 1 && positions[0]) {
		positions[0].pageNumber = pageNumber;
	}
}
