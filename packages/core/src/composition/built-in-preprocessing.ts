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
import { preprocessNodeReferences } from "../features/text/preprocess-node-references";
import { tocFeature } from "../features/toc/toc.feature";
import type { PdfCraftExtensions } from "../types";
import type {
	NodeReference,
	NodeText,
	PdfNode,
	PreprocessedPdfNode,
	RawPdfNode,
} from "../types/internal";
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

interface PreprocessingState {
	parentNode: PreprocessedPdfNode | null;
	readonly tocs: Record<string, PreprocessedPdfNode>;
	readonly nodeReferences: Record<string, NodeReference<PreprocessedPdfNode>>;
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

/**
 * Preprocesses a document or an independent block. Each call starts from fresh reference and
 * table-of-contents state, so no pass leaks into the next one.
 */
export function createBuiltInPreprocessing(extensions: PdfCraftExtensions = []) {
	const registry = createNodeFeatureRegistry([
		...builtInFeatures,
		{ ...extensionFeature, matches: (node: PdfNode) => extensionFeature.matches(node, extensions) },
	]);

	const preprocessTree = (input: unknown, allowSections: boolean): PreprocessedPdfNode => {
		const state: PreprocessingState = { parentNode: null, tocs: {}, nodeReferences: {} };
		const createContext = (allowSections: boolean): BuiltInPreprocessContext => ({
			allowSections,
			get parentNode() {
				return state.parentNode;
			},
			set parentNode(parentNode: PreprocessedPdfNode | null) {
				state.parentNode = parentNode;
			},
			get tocs() {
				return state.tocs;
			},
			preprocessNode,
			preprocessReferences: (item) =>
				preprocessNodeReferences(item, {
					parentNode: state.parentNode,
					nodeReferences: state.nodeReferences,
				}),
			preprocessTable: (item, isSectionAllowed) =>
				tableFeature.preprocess(item, createContext(isSectionAllowed)),
			registerTocItem: (item) =>
				tocFeature.registerItem(item, { parentNode: state.parentNode, tocs: state.tocs }),
		});

		function preprocessNode(item: unknown, isSectionAllowed = false): PreprocessedPdfNode {
			const node = normalizeNode(item);
			const result = registry.dispatch(node)?.preprocess(node, createContext(isSectionAllowed));
			if (result) return result;
			throw new Error(`Unrecognized document structure: ${stringifyNode(node)}`);
		}

		return preprocessNode(input, allowSections);
	};

	return {
		/** Preprocesses a whole document, where top-level sections are allowed. */
		preprocessDocument: (input: unknown) => preprocessTree(input, true),
		/** Preprocesses a standalone block such as a header, footer or background. */
		preprocessBlock: (input: unknown) => preprocessTree(input, false),
	};
}

export type BuiltInPreprocessing = ReturnType<typeof createBuiltInPreprocessing>;
