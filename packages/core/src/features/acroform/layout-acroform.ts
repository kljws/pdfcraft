import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutPdfNode } from "../../types/internal";

export interface AcroFormLayoutContext {
	writer: PageElementWriter;
}

export function layoutAcroForm(node: LayoutPdfNode, context: AcroFormLayoutContext): void {
	const position = context.writer.addAcroForm(node);
	if (position) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
