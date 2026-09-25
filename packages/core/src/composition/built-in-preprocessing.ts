import { extensionFeature } from "../features/extension/extension.feature";
import { tableFeature } from "../features/table/table.feature";
import { textFeature } from "../features/text/text.feature";
import { asRawText, normalizeTextProperty } from "../features/text/preprocess-text";
import type { PreprocessedTextNode } from "../features/text/text.types";
import { tocFeature } from "../features/toc/toc.feature";
import type { PdfCraftExtensions } from "../types";
import type { NodeText, PdfNode, PreprocessedPdfNode, RawPdfNode } from "../types/internal";
import { stringifyNode } from "../utils/node";
import { isEmptyObject, isNumber, isObject, isString, isValue } from "../utils/variable-type";
import { getBuiltInFeature } from "./built-in-feature-registry";

interface BuiltInPreprocessingHost {
	parentNode: PreprocessedPdfNode | null;
	tocs: Record<string, PreprocessedPdfNode>;
	preprocessNode(input: unknown, isSectionAllowed?: boolean): PreprocessedPdfNode;
	preprocessReferences(node: PreprocessedTextNode): void;
}

const hasBlockDecoration = (node: PdfNode): boolean => {
	const block = node as unknown as Record<string, unknown>;
	return ["borderRadius", "borderWidth", "backgroundColor", "padding"].some(
		(property) => block[property] !== undefined,
	);
};

const normalizeNode = (input: unknown): PdfNode => {
	let rawNode: RawPdfNode;
	if (Array.isArray(input)) {
		rawNode = { stack: input as RawPdfNode[] };
	} else if (
		isString(input) ||
		isNumber(input) ||
		typeof input === "boolean" ||
		!isValue(input) ||
		isEmptyObject(input)
	) {
		rawNode = { text: asRawText(input) };
	} else if (isObject(input)) {
		rawNode = input as RawPdfNode;
	} else {
		const description =
			typeof input === "symbol" || typeof input === "function"
				? String(input)
				: stringifyNode(input);
		throw new Error(`Unrecognized document structure: ${description}`);
	}

	const node = rawNode as PdfNode;
	if ("text" in node) {
		node.text = normalizeTextProperty(node.text) as NodeText;
	}
	return node;
};

export function createBuiltInPreprocessing(
	host: BuiltInPreprocessingHost,
	extensions: PdfCraftExtensions = [],
) {
	const preprocessTable = (node: PdfNode, isSectionAllowed = false): PreprocessedPdfNode =>
		tableFeature.preprocess(node, {
			allowSections: isSectionAllowed,
			preprocessNode: (item, allowSections) => host.preprocessNode(item, allowSections),
		});
	const registerTocItem = (node: PreprocessedPdfNode): void =>
		tocFeature.registerItem(node, {
			parentNode: host.parentNode,
			tocs: host.tocs,
		});
	const preprocessText = (node: PdfNode): PreprocessedPdfNode =>
		textFeature.preprocess(node, {
			get parentNode() {
				return host.parentNode;
			},
			set parentNode(parentNode: PreprocessedPdfNode | null) {
				host.parentNode = parentNode;
			},
			registerTocItem,
			preprocessReferences: (item) => host.preprocessReferences(item),
			preprocessNode: (item) => host.preprocessNode(item),
		});
	const preprocessBuiltIn = (
		node: PdfNode,
		allowSections: boolean,
	): PreprocessedPdfNode | undefined => {
		const feature = getBuiltInFeature(node);
		if (!feature) return undefined;
		switch (feature.kind) {
			case "section":
				return feature.preprocess(node, {
					allowSections,
					preprocessNode: (item) => host.preprocessNode(item),
				});
			case "columns":
				return feature.preprocess(node, host);
			case "stack":
				return hasBlockDecoration(node)
					? feature.preprocessDecorated(node, {
							allowSections,
							preprocessTable,
						})
					: feature.preprocess(node, {
							allowSections,
							preprocessNode: (item, allow) => host.preprocessNode(item, allow),
						});
			case "list":
				return feature.preprocess(node, host);
			case "table":
				return preprocessTable(node);
			case "text":
				return preprocessText(node);
			case "toc":
				return feature.preprocess(node, {
					tocs: host.tocs,
					preprocessNode: (item) => host.preprocessNode(item),
				});
			case "image":
			case "canvas":
			case "attachment":
			case "acroform":
				return feature.preprocess(node, undefined);
		}
	};

	return {
		normalizeNode,
		processNode: (node: PdfNode, isSectionAllowed: boolean) => {
			const builtIn = preprocessBuiltIn(node, isSectionAllowed);
			if (builtIn) return builtIn;
			if (typeof node._kind === "string") return undefined;
			if (textFeature.matchesReference(node)) return preprocessText(node);
			if (extensionFeature.matches(node, extensions)) return extensionFeature.preprocess(node);
			return undefined;
		},
	};
}
