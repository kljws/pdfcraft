import type StyleContextStack from "../../services/styles/style-context-stack";
import type { MeasuredPdfNode } from "../../types/internal";
import type TextInlines from "./text-inlines";
import type { TextFragment } from "./text.types";

export interface TextMeasureContext {
	inlines: TextInlines;
	styles: StyleContextStack;
}

export function measureText(node: MeasuredPdfNode, context: TextMeasureContext): MeasuredPdfNode {
	if (node._textRef?._textNodeRef?.text) node.text = node._textRef._textNodeRef.text;

	const styles = context.styles.clone();
	styles.push(node);
	const data = context.inlines.buildInlines(node.text as TextFragment | TextFragment[], styles);

	node._inlines = data.items;
	node._minWidth = data.minWidth;
	node._maxWidth = data.maxWidth;
	return node;
}
