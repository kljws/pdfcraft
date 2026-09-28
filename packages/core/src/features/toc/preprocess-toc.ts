import { markNodeKind } from "../../utils/node";
import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { isString } from "../../utils/variable-type";
import type { PreprocessedTocNode } from "./toc.types";

export type TocPreprocessContext = {
	tocs: Record<string, PreprocessedPdfNode>;
	preprocessNode(input: unknown): PreprocessedPdfNode;
};

export type TocItemRegistrationContext = {
	parentNode: PreprocessedPdfNode | null;
	tocs: Record<string, PreprocessedPdfNode>;
};

export function registerTocItem(
	node: PreprocessedPdfNode,
	context: TocItemRegistrationContext,
): void {
	if (!node.tocItem) return;
	if (!Array.isArray(node.tocItem)) node.tocItem = [node.tocItem];

	node.tocItem = node.tocItem.map((item) => (isString(item) ? item : "_default_"));
	for (const tocItemId of node.tocItem) {
		let tocNode = context.tocs[tocItemId];
		if (!tocNode) {
			tocNode = { _kind: "toc", toc: { _items: [], _pseudo: true } };
			context.tocs[tocItemId] = tocNode;
		}
		if (tocNode._kind !== "toc") {
			throw new Error(`Internal preprocessing error: missing TOC '${tocItemId}'`);
		}
		const toc = tocNode.toc;

		if (!node.id) node.id = `toc-${tocItemId}-${toc._items.length}`;
		toc._items.push({
			_nodeRef: context.parentNode ?? node,
			_textNodeRef: node,
		});
	}
}

export function preprocessToc(node: PdfNode, context: TocPreprocessContext): PreprocessedTocNode {
	if (!node.toc) throw new Error("Internal preprocessing error: expected a TOC node");
	const tocNode = markNodeKind(node, "toc");
	const toc = tocNode.toc;
	if (!toc.id) toc.id = "_default_";

	toc.title = toc.title ? context.preprocessNode(toc.title) : null;
	toc._items = [];

	const registeredNode = context.tocs[toc.id];
	if (registeredNode) {
		if (registeredNode._kind !== "toc") {
			throw new Error(`Internal preprocessing error: missing TOC '${toc.id}'`);
		}
		const registeredToc = registeredNode.toc;
		if (!registeredToc._pseudo) throw new Error(`TOC '${toc.id}' already exists`);
		toc._items = registeredToc._items;
	}

	context.tocs[toc.id] = tocNode;
	return tocNode;
}
