import type DocumentContext from "../document/document-context";
import type { LayoutPdfNode, LineLike, PageItem, Position, Vector } from "../types/internal";
import { offsetVector, pack } from "../utils/tools";
import { notifyVectorInsertion } from "./vector-insertion";

type VectorPageItem = Extract<PageItem, { type: "vector" }>;

export interface ElementFragment {
	height: number;
	xOffset?: number;
	yOffset?: number;
	items: PageItem[];
}

interface FragmentWriter {
	context(): DocumentContext;
}

export function replayFragment(
	writer: FragmentWriter,
	block: ElementFragment,
	useBlockXOffset: boolean | undefined,
	useBlockYOffset: boolean | undefined,
	dontUpdateContextPosition: boolean | undefined,
): boolean {
	const ctx = writer.context();
	const page = ctx.getCurrentPage();

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
					_isFillColorFromUnbreakable?: boolean;
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
					const endOfBackgroundItemsIndex = ctx.backgroundLength[ctx.page];
					page.items.splice(endOfBackgroundItemsIndex, 0, pageItem);
				} else {
					page.items.push(pageItem);
				}
				notifyVectorInsertion(v, ctx.page, page, pageItem);
				break;
			}

			case "image":
			case "extension":
			case "attachment":
			case "acroform": {
				const image = pack(item.item) as LayoutPdfNode;
				updateNodePageNumbers(image, ctx.page + 1);

				image.x = (image.x || 0) + (useBlockXOffset ? block.xOffset || 0 : ctx.x);
				image.y = (image.y || 0) + (useBlockYOffset ? block.yOffset || 0 : ctx.y);

				page.items.push({ type: item.type, item: image });
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
		}
	});

	if (!dontUpdateContextPosition) {
		ctx.moveDown(block.height);
	}

	return true;
}

function updateNodePageNumbers(
	item: { _node?: LayoutPdfNode; _position?: Position },
	pageNumber: number,
): void {
	if (item._position) {
		item._position.pageNumber = pageNumber;
		return;
	}

	// Compatibility for fragments created outside LayoutBuilder, where only a
	// single position was historically associated with the rendered item.
	if (item._node?.positions?.length === 1) {
		item._node.positions[0].pageNumber = pageNumber;
	}
}
