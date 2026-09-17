import type { NodeText, PdfNode, PreprocessedPdfNode, RawPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";
import { isEmptyObject, isNumber, isObject, isString, isValue } from "../../utils/variable-type";
import type { PreprocessedTextNode } from "./text.types";

export interface TextPreprocessContext {
	parentNode: PreprocessedPdfNode | null;
	registerTocItem(node: PreprocessedPdfNode): void;
	preprocessReferences(node: PreprocessedTextNode): void;
	preprocessNode(input: unknown): PreprocessedPdfNode;
}

export function normalizeTextValue(value: unknown): unknown {
	if (isString(value)) return value.replace(/\t/g, "    ");
	if (isNumber(value) || typeof value === "boolean") return value.toString();
	if (!isValue(value) || isEmptyObject(value)) return "";
	return value;
}

export function normalizeTextProperty(value: unknown): unknown {
	if (
		!isString(value) &&
		!isNumber(value) &&
		typeof value !== "boolean" &&
		isValue(value) &&
		!isEmptyObject(value) &&
		!Array.isArray(value) &&
		(!isObject(value) || !("text" in value))
	) {
		throw new Error(
			`Invalid text value: expected a string, number, boolean, array or nested text node, received ${stringifyNode(value)}`,
		);
	}
	return normalizeTextValue(value);
}

export function asRawText(value: unknown): NodeText<RawPdfNode> {
	return normalizeTextValue(value) as NodeText<RawPdfNode>;
}

export function preprocessText(
	node: PdfNode,
	context: TextPreprocessContext,
): PreprocessedTextNode {
	node._kind = "text";
	const textNode = node as unknown as PreprocessedTextNode;
	context.registerTocItem(textNode);
	context.preprocessReferences(textNode);

	if (isObject(textNode.text) && "text" in textNode.text) {
		textNode.text = [context.preprocessNode(textNode.text)];
	} else if (Array.isArray(textNode.text)) {
		const ownsParent = context.parentNode === null;
		if (ownsParent) context.parentNode = textNode;
		for (let index = 0; index < textNode.text.length; index++) {
			textNode.text[index] = context.preprocessNode(textNode.text[index]);
		}
		if (ownsParent) context.parentNode = null;
	}

	return textNode;
}
