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

interface BuiltInPreprocessingHost {
	parentNode: PreprocessedPdfNode | null;
	tocs: Record<string, PreprocessedPdfNode>;
	preprocessNode(input: unknown, isSectionAllowed?: boolean): PreprocessedPdfNode;
	preprocessReferences(node: PreprocessedPdfNode): void;
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
) {
	const preprocessTable = (
		node: PreprocessedPdfNode,
		isSectionAllowed = false,
	): PreprocessedPdfNode =>
		tableFeature.preprocess(node, {
			allowSections: isSectionAllowed,
			preprocessNode: (item, allowSections) => host.preprocessNode(item, allowSections),
		});
	const registerTocItem = (node: PreprocessedPdfNode): void =>
		tocFeature.registerItem(node, {
			parentNode: host.parentNode,
			tocs: host.tocs,
		});
	const preprocessText = (node: PreprocessedPdfNode): PreprocessedPdfNode =>
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
	const handlers: NodeStageHandler<PreprocessedPdfNode, boolean, PreprocessedPdfNode>[] = [
		...createBuiltInFeatureHandlers<PreprocessedPdfNode, boolean, PreprocessedPdfNode>({
			section: (node, allowSections) =>
				sectionFeature.preprocess(node, {
					allowSections,
					preprocessNode: (item) => host.preprocessNode(item),
				}),
			columns: (node) => columnsFeature.preprocess(node, host),
			stack: (node, allowSections) =>
				hasBlockDecoration(node)
					? stackFeature.preprocessDecorated(node, {
							allowSections,
							preprocessTable,
						})
					: stackFeature.preprocess(node, {
							allowSections,
							preprocessNode: (item, allow) => host.preprocessNode(item, allow),
						}),
			list: (node) => listFeature.preprocess(node, host),
			table: (node) => preprocessTable(node),
			text: preprocessText,
			toc: (node) =>
				tocFeature.preprocess(node, {
					tocs: host.tocs,
					preprocessNode: (item) => host.preprocessNode(item),
				}),
			image: (node) => imageFeature.preprocess(node, undefined),
			canvas: (node) => canvasFeature.preprocess(node, undefined),
			attachment: (node) => attachmentFeature.preprocess(node, undefined),
			acroform: (node) => acroFormFeature.preprocess(node, undefined),
		}),
		{
			matches: (node) => textFeature.matchesReference(node),
			process: preprocessText,
		},
		{
			matches: (node) => extensionFeature.matches(node, extensions),
			process: (node) => node,
		},
	];

	return {
		normalizeNode,
		processNode: (node: PreprocessedPdfNode, isSectionAllowed: boolean) => {
			const result = dispatchNodeStage(node, isSectionAllowed, handlers);
			return result.handled ? result.value : undefined;
		},
	};
}
