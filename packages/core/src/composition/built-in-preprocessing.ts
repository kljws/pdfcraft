import type { ColumnsPreprocessContext } from "../features/columns/preprocess-columns";
import type { ListPreprocessContext } from "../features/list/preprocess-list";
import type { SectionPreprocessContext } from "../features/section/preprocess-section";
import type { DecoratedStackPreprocessContext } from "../features/stack/preprocess-decorated-stack";
import type { StackPreprocessContext } from "../features/stack/preprocess-stack";
import type { TablePreprocessContext } from "../features/table/preprocess-table";
import type { TextPreprocessContext } from "../features/text/preprocess-text";
import type { TocPreprocessContext } from "../features/toc/preprocess-toc";
import { extensionFeature } from "../features/extension/extension.feature";
import { tableFeature } from "../features/table/table.feature";
import { asRawText, normalizeTextProperty } from "../features/text/preprocess-text";
import type { PreprocessedTextNode } from "../features/text/text.types";
import { tocFeature } from "../features/toc/toc.feature";
import type { PdfCraftExtensions } from "../types";
import type { NodeText, PdfNode, PreprocessedPdfNode, RawPdfNode } from "../types/internal";
import { stringifyNode } from "../utils/node";
import { isEmptyObject, isNumber, isObject, isString, isValue } from "../utils/variable-type";
import { builtInFeatures, createNodeFeatureRegistry } from "./built-in-feature-registry";

/**
 * Every capability a built-in feature may request while preprocessing. Each feature declares
 * the narrow subset it needs; composition supplies them all through one context.
 */
type BuiltInPreprocessContext = ColumnsPreprocessContext &
	ListPreprocessContext &
	SectionPreprocessContext &
	StackPreprocessContext &
	DecoratedStackPreprocessContext &
	TablePreprocessContext &
	TextPreprocessContext &
	TocPreprocessContext;

interface BuiltInPreprocessingHost {
	parentNode: PreprocessedPdfNode | null;
	tocs: Record<string, PreprocessedPdfNode>;
	preprocessNode(input: unknown, isSectionAllowed?: boolean): PreprocessedPdfNode;
	preprocessReferences(node: PreprocessedTextNode): void;
}

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
	const registry = createNodeFeatureRegistry([
		...builtInFeatures,
		{ ...extensionFeature, matches: (node: PdfNode) => extensionFeature.matches(node, extensions) },
	]);
	const createContext = (allowSections: boolean): BuiltInPreprocessContext => ({
		allowSections,
		get parentNode() {
			return host.parentNode;
		},
		set parentNode(parentNode: PreprocessedPdfNode | null) {
			host.parentNode = parentNode;
		},
		get tocs() {
			return host.tocs;
		},
		preprocessNode: (item: unknown, isSectionAllowed?: boolean) =>
			host.preprocessNode(item, isSectionAllowed),
		preprocessReferences: (item) => host.preprocessReferences(item),
		preprocessTable: (item, isSectionAllowed) =>
			tableFeature.preprocess(item, createContext(isSectionAllowed)),
		registerTocItem: (item) =>
			tocFeature.registerItem(item, { parentNode: host.parentNode, tocs: host.tocs }),
	});

	return {
		normalizeNode,
		processNode: (node: PdfNode, isSectionAllowed: boolean): PreprocessedPdfNode | undefined =>
			registry.dispatch(node)?.preprocess(node, createContext(isSectionAllowed)),
	};
}
