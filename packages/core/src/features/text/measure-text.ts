import type StyleContextStack from "../../services/styles/style-context-stack";
import type TextInlines from "./text-inlines";
import type { MeasuredTextNode, TextFragment, TextMeasureNode } from "./text.types";

export interface TextMeasureContext {
	inlines: TextInlines;
	styles: StyleContextStack;
}

export function measureText(node: TextMeasureNode, context: TextMeasureContext): MeasuredTextNode {
	if (node._textRef?._textNodeRef?.text) node.text = node._textRef._textNodeRef.text;

	const styles = context.styles.clone();
	styles.push(node);
	const data = context.inlines.buildInlines(node.text as TextFragment | TextFragment[], styles);

	node.metrics = { inlines: data.items };
	node._minWidth = data.minWidth;
	node._maxWidth = data.maxWidth;
	return node as MeasuredTextNode;
}
