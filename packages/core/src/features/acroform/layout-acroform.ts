import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutAcroFormNode } from "./acroform.types";

export interface AcroFormLayoutContext {
	writer: PageElementWriter;
}

export function layoutAcroForm(node: LayoutAcroFormNode, context: AcroFormLayoutContext): void {
	const position = context.writer.addFeatureItem("acroform", node);
	if (position && !Array.isArray(position)) {
		node._position = position;
		node.positions ??= [];
		node.positions.push(position);
	}
	node._node = node;
}
