import type StyleContextStack from "../../services/styles/style-context-stack";
import type TextInlines from "./text-inlines";
import { getPageReferenceText } from "./preprocess-node-references";
import type { MeasuredTextNode, TextFragment, TextMeasureNode } from "./text.types";

export type TextMeasureContext = {
	inlines: TextInlines;
	styles: StyleContextStack;
};

export function measureText(node: TextMeasureNode, context: TextMeasureContext): MeasuredTextNode {
	if (node._pageRef) node.text = getPageReferenceText(node._pageRef);
	if (node._pageRef || node._tocItemRef) node._pageReferenceText = String(node.text);
	const referencedNode = node._textRef?._textNodeRef;
	if (referencedNode?._kind === "text" && referencedNode.text) node.text = referencedNode.text;

	const styles = context.styles.clone();
	styles.push(node);
	const data = context.inlines.buildInlines(node.text as TextFragment | TextFragment[], styles);

	const measuredNode = node as MeasuredTextNode;
	measuredNode.metrics = { inlines: data.items };
	measuredNode._minWidth = data.minWidth;
	measuredNode._maxWidth = data.maxWidth;
	return measuredNode;
}
