import type { LayoutPdfNode } from "../../types/internal";
import type { LayoutTocNode } from "./toc.types";

export interface TocLayoutContext {
	processNode(node: LayoutPdfNode): void;
}

export function layoutToc(node: LayoutTocNode, context: TocLayoutContext): void {
	const toc = node.toc;
	if (!toc) throw new Error("Internal layout error: expected a preprocessed TOC node");
	if (!toc._table && toc.hideEmpty === true) return;

	if (toc.title) context.processNode(toc.title);
	if (toc._table) context.processNode(toc._table);
}
