import type { NodeText, PreprocessedPdfNode, RawPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";
import { isEmptyObject, isNumber, isObject, isString, isValue } from "../../utils/variable-type";

export interface TextPreprocessContext {
	parentNode: PreprocessedPdfNode | null;
	registerTocItem(node: PreprocessedPdfNode): void;
	preprocessReferences(node: PreprocessedPdfNode): void;
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
	node: PreprocessedPdfNode,
	context: TextPreprocessContext,
): PreprocessedPdfNode {
	context.registerTocItem(node);
	context.preprocessReferences(node);

	if (isObject(node.text) && "text" in node.text) {
		node.text = [context.preprocessNode(node.text)];
	} else if (Array.isArray(node.text)) {
		const ownsParent = context.parentNode === null;
		if (ownsParent) context.parentNode = node;
		for (let index = 0; index < node.text.length; index++) {
			node.text[index] = context.preprocessNode(node.text[index]);
		}
		if (ownsParent) context.parentNode = null;
	}

	return node;
}
