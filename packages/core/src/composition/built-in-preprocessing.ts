import { acroFormFeature } from "../features/acroform/acroform.feature";
import { attachmentFeature } from "../features/attachment/attachment.feature";
import { canvasFeature } from "../features/canvas/canvas.feature";
import { columnsFeature } from "../features/columns/columns.feature";
import { extensionFeature } from "../features/extension/extension.feature";
import { imageFeature } from "../features/image/image.feature";
import { listFeature } from "../features/list/list.feature";
import { sectionFeature } from "../features/section/section.feature";
import { stackFeature } from "../features/stack/stack.feature";
import { tableFeature } from "../features/table/table.feature";
import { textFeature } from "../features/text/text.feature";
import { asRawText, normalizeTextProperty } from "../features/text/preprocess-text";
import { tocFeature } from "../features/toc/toc.feature";
import { dispatchNodeStage, type NodeStageHandler } from "../engine/node-stage-dispatcher";
import type { PdfCraftExtensions } from "../types";
import type { NodeText, PreprocessedPdfNode, RawPdfNode } from "../types/internal";
import { stringifyNode } from "../utils/node";
import { isEmptyObject, isNumber, isObject, isString, isValue } from "../utils/variable-type";
import { createBuiltInFeatureHandlers } from "./built-in-feature-registry";

export interface BuiltInPreprocessingHost {
	parentNode: PreprocessedPdfNode | null;
	tocs: Record<string, PreprocessedPdfNode>;
	preprocessNode(input: unknown, isSectionAllowed?: boolean): PreprocessedPdfNode;
	preprocessAcroForm(node: PreprocessedPdfNode): PreprocessedPdfNode;
	preprocessSection(node: PreprocessedPdfNode, isSectionAllowed?: boolean): PreprocessedPdfNode;
	preprocessColumns(node: PreprocessedPdfNode): PreprocessedPdfNode;
	preprocessVerticalContainer(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean,
	): PreprocessedPdfNode;
	preprocessDecoratedVerticalContainer(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean,
	): PreprocessedPdfNode;
	preprocessList(node: PreprocessedPdfNode): PreprocessedPdfNode;
	preprocessTable(node: PreprocessedPdfNode, isSectionAllowed?: boolean): PreprocessedPdfNode;
	preprocessText(node: PreprocessedPdfNode): PreprocessedPdfNode;
	preprocessToc(node: PreprocessedPdfNode): PreprocessedPdfNode;
	registerTocItem(node: PreprocessedPdfNode): void;
	preprocessReferences(node: PreprocessedPdfNode): void;
}

export interface BuiltInPreprocessing {
	normalizeNode(input: unknown): PreprocessedPdfNode;
	processNode(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean,
	): PreprocessedPdfNode | undefined;
	preprocessAcroForm(node: PreprocessedPdfNode): PreprocessedPdfNode;
	preprocessSection(node: PreprocessedPdfNode, isSectionAllowed: boolean): PreprocessedPdfNode;
	preprocessColumns(node: PreprocessedPdfNode): PreprocessedPdfNode;
	preprocessVerticalContainer(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean,
	): PreprocessedPdfNode;
	preprocessDecoratedVerticalContainer(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean,
	): PreprocessedPdfNode;
	preprocessList(node: PreprocessedPdfNode): PreprocessedPdfNode;
	preprocessTable(node: PreprocessedPdfNode, isSectionAllowed: boolean): PreprocessedPdfNode;
	preprocessText(node: PreprocessedPdfNode): PreprocessedPdfNode;
	preprocessToc(node: PreprocessedPdfNode): PreprocessedPdfNode;
	registerTocItem(node: PreprocessedPdfNode): void;
}

const hasBlockDecoration = (node: PreprocessedPdfNode): boolean => {
	const block = node as unknown as Record<string, unknown>;
	return ["borderRadius", "borderWidth", "backgroundColor", "padding"].some(
		(property) => block[property] !== undefined,
	);
};

const normalizeNode = (input: unknown): PreprocessedPdfNode => {
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

	const node = rawNode as PreprocessedPdfNode;
	if ("text" in node) {
		node.text = normalizeTextProperty(node.text) as NodeText<PreprocessedPdfNode>;
	}
	return node;
};

export function createBuiltInPreprocessing(
	host: BuiltInPreprocessingHost,
	extensions: PdfCraftExtensions = [],
): BuiltInPreprocessing {
	const handlers: NodeStageHandler<PreprocessedPdfNode, boolean, PreprocessedPdfNode>[] = [
		...createBuiltInFeatureHandlers<PreprocessedPdfNode, boolean, PreprocessedPdfNode>({
			section: (node, allowSections) => host.preprocessSection(node, allowSections),
			columns: (node) => host.preprocessColumns(node),
			stack: (node, allowSections) =>
				hasBlockDecoration(node)
					? host.preprocessDecoratedVerticalContainer(node, allowSections)
					: host.preprocessVerticalContainer(node, allowSections),
			list: (node) => host.preprocessList(node),
			table: (node) => host.preprocessTable(node),
			text: (node) => host.preprocessText(node),
			toc: (node) => host.preprocessToc(node),
			image: (node) => imageFeature.preprocess(node, undefined),
			canvas: (node) => canvasFeature.preprocess(node, undefined),
			attachment: (node) => attachmentFeature.preprocess(node, undefined),
			acroform: (node) => host.preprocessAcroForm(node),
		}),
		{
			matches: (node) => textFeature.matchesReference(node),
			process: (node) => host.preprocessText(node),
		},
		{
			matches: (node) => extensionFeature.matches(node, extensions),
			process: (node) => node,
		},
	];

	return {
		normalizeNode,
		processNode: (node, isSectionAllowed) => {
			const result = dispatchNodeStage(node, isSectionAllowed, handlers);
			return result.handled ? result.value : undefined;
		},
		preprocessAcroForm: (node) => acroFormFeature.preprocess(node, undefined),
		preprocessSection: (node, isSectionAllowed) =>
			sectionFeature.preprocess(node, {
				allowSections: isSectionAllowed,
				preprocessNode: (item) => host.preprocessNode(item),
			}),
		preprocessColumns: (node) => columnsFeature.preprocess(node, host),
		preprocessVerticalContainer: (node, isSectionAllowed) =>
			stackFeature.preprocess(node, {
				allowSections: isSectionAllowed,
				preprocessNode: (item, allowSections) => host.preprocessNode(item, allowSections),
			}),
		preprocessDecoratedVerticalContainer: (node, isSectionAllowed) =>
			stackFeature.preprocessDecorated(node, {
				allowSections: isSectionAllowed,
				preprocessTable: (tableNode, allowSections) =>
					host.preprocessTable(tableNode, allowSections),
			}),
		preprocessList: (node) => listFeature.preprocess(node, host),
		preprocessTable: (node, isSectionAllowed) =>
			tableFeature.preprocess(node, {
				allowSections: isSectionAllowed,
				preprocessNode: (item, allowSections) => host.preprocessNode(item, allowSections),
			}),
		preprocessText: (node) => textFeature.preprocess(node, host),
		preprocessToc: (node) =>
			tocFeature.preprocess(node, {
				tocs: host.tocs,
				preprocessNode: (item) => host.preprocessNode(item),
			}),
		registerTocItem: (node) =>
			tocFeature.registerItem(node, {
				parentNode: host.parentNode,
				tocs: host.tocs,
			}),
	};
}
