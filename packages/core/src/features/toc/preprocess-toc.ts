import type { PreprocessedPdfNode } from "../../types/internal";
import { isString } from "../../utils/variable-type";

export interface TocPreprocessContext {
	tocs: Record<string, PreprocessedPdfNode>;
	preprocessNode(input: unknown): PreprocessedPdfNode;
}

export interface TocItemRegistrationContext {
	parentNode: PreprocessedPdfNode | null;
	tocs: Record<string, PreprocessedPdfNode>;
}

export function registerTocItem(
	node: PreprocessedPdfNode,
	context: TocItemRegistrationContext,
): void {
	if (!node.tocItem) return;
	if (!Array.isArray(node.tocItem)) node.tocItem = [node.tocItem];

	for (let index = 0; index < node.tocItem.length; index++) {
		if (!isString(node.tocItem[index])) node.tocItem[index] = "_default_";
		const tocItemId = node.tocItem[index];

		if (!context.tocs[tocItemId]) {
			context.tocs[tocItemId] = { toc: { _items: [], _pseudo: true } };
		}
		const toc = context.tocs[tocItemId].toc;
		if (!toc) throw new Error(`Internal preprocessing error: missing TOC '${tocItemId}'`);

		if (!node.id) node.id = `toc-${tocItemId}-${toc._items.length}`;
		toc._items.push({
			_nodeRef: context.parentNode ?? node,
			_textNodeRef: node,
		});
	}
}

export function preprocessToc(
	node: PreprocessedPdfNode,
	context: TocPreprocessContext,
): PreprocessedPdfNode {
	const toc = node.toc;
	if (!toc) throw new Error("Internal preprocessing error: expected a TOC node");
	if (!toc.id) toc.id = "_default_";

	toc.title = toc.title ? context.preprocessNode(toc.title) : null;
	toc._items = [];

	if (context.tocs[toc.id]) {
		const registeredToc = context.tocs[toc.id].toc;
		if (!registeredToc) {
			throw new Error(`Internal preprocessing error: missing TOC '${toc.id}'`);
		}
		if (!registeredToc._pseudo) throw new Error(`TOC '${toc.id}' already exists`);
		toc._items = registeredToc._items;
	}

	context.tocs[toc.id] = node;
	return node;
}
