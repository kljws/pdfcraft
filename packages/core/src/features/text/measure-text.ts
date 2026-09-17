import type StyleContextStack from "../../services/styles/style-context-stack";
import type TextInlines from "./text-inlines";
import type { MeasuredTextNode, TextFragment, TextMeasureNode } from "./text.types";

export interface TextMeasureContext {
	inlines: TextInlines;
	styles: StyleContextStack;
}

export function measureText(node: TextMeasureNode, context: TextMeasureContext): MeasuredTextNode {
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
