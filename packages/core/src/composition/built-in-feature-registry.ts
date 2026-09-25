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

interface RegistryFeature {
	readonly kind: string;
	matches(node: PdfNode): boolean;
}

export function createNodeFeatureRegistry<const Features extends readonly RegistryFeature[]>(
	features: Features,
) {
	const byKind = new Map<string, Features[number]>();
	for (const feature of features) {
		if (byKind.has(feature.kind)) {
			throw new Error(`Duplicate node feature kind '${feature.kind}'`);
		}
		byKind.set(feature.kind, feature);
	}

	return {
		byKind: byKind as ReadonlyMap<string, Features[number]>,
		/**
		 * Resolves preprocessed nodes by `_kind` and public nodes by matcher. A public node
		 * recognized by several features is rejected instead of depending on registry order.
		 */
		dispatch(node: PdfNode): Features[number] | undefined {
			if (typeof node._kind === "string") return byKind.get(node._kind);
			const matches = features.filter((feature) => feature.matches(node));
			if (matches.length > 1) {
				const kinds = matches.map((feature) => `'${feature.kind}'`).join(", ");
				throw new Error(`Ambiguous document node matches ${kinds}: ${stringifyNode(node)}`);
			}
			return matches[0];
		},
	};
}

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

export const builtInFeatureRegistry = createNodeFeatureRegistry(builtInFeatures);

/**
 * Features reachable by `_kind` once preprocessing has run. Registered extensions share one
 * `extension` descriptor; its matcher needs the instance extensions and lives in preprocessing.
 */
const nodeFeatures = [...builtInFeatures, extensionFeature] as const;
type NodeFeatureDescriptor = (typeof nodeFeatures)[number];
const nodeFeaturesByKind = new Map<string, NodeFeatureDescriptor>(
	nodeFeatures.map((feature) => [feature.kind, feature]),
);

export function getBuiltInFeatureByKind(kind: string): NodeFeatureDescriptor | undefined {
	return nodeFeaturesByKind.get(kind);
}

/**
 * Stage hooks receive the composed context and the node of their own kind; each feature declares
 * the context subset and node shape it consumes. Dispatch by `_kind` guarantees the node shape,
 * so the hook is invoked with the lifecycle union and the composition's concrete context type.
 */
export function measureRegisteredNodeFeature<Context extends NodeMeasureContext>(
	node: MeasurePdfNode,
	context: Context,
): MeasuredPdfNode | undefined {
	const measure = getBuiltInFeatureByKind(node._kind)?.measure as
		| NodeMeasureHook<Context>
		| undefined;
	return measure?.(node, context);
}

export function layoutRegisteredNodeFeature<Context extends NodeLayoutContext>(
	node: LayoutPdfNode,
	context: Context,
): boolean {
	const layout = getBuiltInFeatureByKind(node._kind)?.layout as NodeLayoutHook<Context> | undefined;
	if (!layout) return false;
	layout(node, context);
	return true;
}

type NodeStateHook = (node: LayoutPdfNode) => void;

export function decorateRegisteredNodeFeature(node: LayoutPdfNode): void {
	const feature = getBuiltInFeatureByKind(node._kind);
	if (feature && "decorate" in feature) (feature.decorate as NodeStateHook | undefined)?.(node);
}

export function resetRegisteredNodeFeature(node: LayoutPdfNode): void {
	const feature = getBuiltInFeatureByKind(node._kind);
	if (feature && "reset" in feature) (feature.reset as NodeStateHook | undefined)?.(node);
}

export function placeFeatureItem(
	featureKind: string,
	node: LayoutPdfNode,
	context: NodePlaceContext,
): NodePlaceResult {
	const feature = getBuiltInFeatureByKind(featureKind);
	if (!feature || !("place" in feature)) {
		throw new Error(`Node feature '${featureKind}' does not support page-item placement`);
	}
	const place = feature.place as NodePlaceHook;
	return place(node, context);
}

export function createBuiltInElementPlacement(): ElementPlacementAdapter {
	return {
		placeFeatureItem: (featureKind, writer, node, index) =>
			placeFeatureItem(featureKind, node, { writer, index }),
	};
}

/** Renders a page item emitted by the feature registered under `featureKind`. */
export function renderFeatureItem<Context>(
	featureKind: string,
	node: LayoutPdfNode,
	context: Context,
): void {
	const feature = getBuiltInFeatureByKind(featureKind);
	if (!feature || !("render" in feature)) {
		throw new Error(`Node feature '${featureKind}' does not support page-item rendering`);
	}
	const render = feature.render as (node: LayoutPdfNode, context: Context) => void;
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
