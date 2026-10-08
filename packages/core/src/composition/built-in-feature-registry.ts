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
import { tocFeature } from "../features/toc/toc.feature";
import type { PdfCraftExtensions } from "../types";
import type { LayoutPdfNode, MeasurePdfNode, MeasuredPdfNode, PdfNode } from "../types/internal";
import type { ElementPlacementAdapter } from "../layout/element-writer";
import { stringifyNode } from "../utils/node";
import type {
	NodeLayoutContext,
	NodeLayoutHook,
	NodeMeasureContext,
	NodeMeasureHook,
	NodePlaceContext,
	NodePlaceHook,
	NodePlaceResult,
} from "../engine/contracts/node-feature";

export const builtInFeatures = [
	sectionFeature,
	columnsFeature,
	stackFeature,
	listFeature,
	tableFeature,
	textFeature,
	tocFeature,
	imageFeature,
	canvasFeature,
	attachmentFeature,
	acroFormFeature,
] as const;

/**
 * Every node feature, reachable by `_kind` once preprocessing has run. Registered extensions share
 * one `extension` descriptor; its matcher needs the instance extensions (`createFeatureDispatch`).
 */
const nodeFeatures = [...builtInFeatures, extensionFeature] as const;
type NodeFeatureDescriptor = (typeof nodeFeatures)[number];

export function indexFeaturesByKind<Feature extends { readonly kind: string }>(
	features: readonly Feature[],
): ReadonlyMap<string, Feature> {
	const byKind = new Map<string, Feature>();
	for (const feature of features) {
		if (byKind.has(feature.kind)) {
			throw new Error(`Duplicate node feature kind '${feature.kind}'`);
		}
		byKind.set(feature.kind, feature);
	}
	return byKind;
}

const nodeFeaturesByKind = indexFeaturesByKind<NodeFeatureDescriptor>(nodeFeatures);

/**
 * Resolves preprocessed nodes by `_kind` and public nodes by matcher. A public node recognized by
 * several features is rejected instead of depending on registry order.
 */
export function createFeatureDispatch(extensions: PdfCraftExtensions) {
	const matchers = [
		...builtInFeatures,
		{ ...extensionFeature, matches: (node: PdfNode) => extensionFeature.matches(node, extensions) },
	];
	return (node: PdfNode): NodeFeatureDescriptor | undefined => {
		if (typeof node._kind === "string") return nodeFeaturesByKind.get(node._kind);
		const matches = matchers.filter((feature) => feature.matches(node));
		if (matches.length > 1) {
			const kinds = matches.map((feature) => `'${feature.kind}'`).join(", ");
			throw new Error(`Ambiguous document node matches ${kinds}: ${stringifyNode(node)}`);
		}
		const [match] = matches;
		return match && nodeFeaturesByKind.get(match.kind);
	};
}

type NodeStateHook = (node: LayoutPdfNode) => void;

/**
 * Stage hooks receive the composed context and the node of their own kind; each feature declares
 * the context subset and node shape it consumes. Dispatch by `_kind` guarantees the node shape,
 * so the hook is returned with the lifecycle union and the composition's concrete context type.
 */
function getStageHook<Hook>(
	kind: string,
	name:
		| "measure"
		| "layout"
		| "preparePage"
		| "establishesFirstPage"
		| "decorate"
		| "reset"
		| "place"
		| "render",
): Hook | undefined {
	const feature = nodeFeaturesByKind.get(kind);
	return feature && name in feature ? (feature[name as keyof typeof feature] as Hook) : undefined;
}

export function measureRegisteredNodeFeature<Context extends NodeMeasureContext>(
	node: MeasurePdfNode,
	context: Context,
): MeasuredPdfNode | undefined {
	return getStageHook<NodeMeasureHook<Context>>(node._kind, "measure")?.(node, context);
}

export function layoutRegisteredNodeFeature<Context extends NodeLayoutContext>(
	node: LayoutPdfNode,
	context: Context,
): boolean {
	const layout = getStageHook<NodeLayoutHook<Context>>(node._kind, "layout");
	if (!layout) return false;
	layout(node, context);
	return true;
}

export function preparePageRegisteredNodeFeature<Context extends NodeLayoutContext>(
	node: LayoutPdfNode,
	context: Context,
): void {
	getStageHook<NodeLayoutHook<Context>>(node._kind, "preparePage")?.(node, context);
}

export function establishesFirstPageRegisteredNodeFeature<Context extends NodeLayoutContext>(
	node: LayoutPdfNode,
	context: Context,
): boolean {
	const establishesFirstPage = getStageHook<(node: LayoutPdfNode, context: Context) => boolean>(
		node._kind,
		"establishesFirstPage",
	);
	return establishesFirstPage?.(node, context) ?? false;
}

export function decorateRegisteredNodeFeature(node: LayoutPdfNode): void {
	getStageHook<NodeStateHook>(node._kind, "decorate")?.(node);
}

export function resetRegisteredNodeFeature(node: LayoutPdfNode): void {
	getStageHook<NodeStateHook>(node._kind, "reset")?.(node);
}

export function placeFeatureItem(
	featureKind: string,
	node: LayoutPdfNode,
	context: NodePlaceContext,
): NodePlaceResult {
	const place = getStageHook<NodePlaceHook>(featureKind, "place");
	if (!place) {
		throw new Error(`Node feature '${featureKind}' does not support page-item placement`);
	}
	return place(node, context);
}

export function createBuiltInElementPlacement(): ElementPlacementAdapter {
	return {
		placeFeatureItem: (featureKind, writer, node, index, allowOverflow) =>
			placeFeatureItem(featureKind, node, { writer, index, allowOverflow }),
	};
}

/** Renders a page item emitted by the feature registered under `featureKind`. */
export function renderFeatureItem<Context>(
	featureKind: string,
	node: LayoutPdfNode,
	context: Context,
): void {
	const render = getStageHook<(node: LayoutPdfNode, context: Context) => void>(
		featureKind,
		"render",
	);
	if (!render) {
		throw new Error(`Node feature '${featureKind}' does not support page-item rendering`);
	}
	render(node, context);
}

/** Lets every feature that owns document-level resources resolve them before measurement. */
export function resolveFeatureResources<Document, Context>(
	document: Document,
	context: Context,
): void {
	for (const feature of nodeFeatures) {
		if (!("resolveResources" in feature)) continue;
		const resolve = feature.resolveResources as (document: Document, context: Context) => void;
		resolve(document, context);
	}
}
