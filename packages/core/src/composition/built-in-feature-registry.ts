import { acroFormFeature } from "../features/acroform/acroform.feature";
import { attachmentFeature } from "../features/attachment/attachment.feature";
import type { LayoutAttachmentNode } from "../features/attachment/attachment.types";
import { canvasFeature } from "../features/canvas/canvas.feature";
import { columnsFeature } from "../features/columns/columns.feature";
import { extensionFeature } from "../features/extension/extension.feature";
import { imageFeature } from "../features/image/image.feature";
import type { LayoutImageNode } from "../features/image/image.types";
import type PDFDocument from "../rendering/pdf-document";
import { listFeature } from "../features/list/list.feature";
import { sectionFeature } from "../features/section/section.feature";
import { stackFeature } from "../features/stack/stack.feature";
import { tableFeature } from "../features/table/table.feature";
import { textFeature } from "../features/text/text.feature";
import { tocFeature } from "../features/toc/toc.feature";
import type {
	LayoutPdfNode,
	MeasurePdfNode,
	MeasuredPdfNode,
	PdfNode,
} from "../types/internal";
import type {
	PrinterDocumentDefinition,
	PrinterResourceReference,
} from "../core/printer.types";
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

export type NodeFeatureHook =
	| "preprocess"
	| "resolveResources"
	| "measure"
	| "layout"
	| "place"
	| "render"
	| "decorate"
	| "reset"
	| "inline";

const NODE_FEATURE_HOOKS: readonly NodeFeatureHook[] = [
	"preprocess",
	"resolveResources",
	"measure",
	"layout",
	"place",
	"render",
	"decorate",
	"reset",
	"inline",
];

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
		features,
		byKind: byKind as ReadonlyMap<string, Features[number]>,
		match(node: PdfNode): Features[number] | undefined {
			return features.find((feature) => feature.matches(node));
		},
		dispatch(node: PdfNode): Features[number] | undefined {
			return typeof node._kind === "string"
				? byKind.get(node._kind)
				: features.find((feature) => feature.matches(node));
		},
		matching(node: PdfNode): Features[number][] {
			return features.filter((feature) => feature.matches(node));
		},
		withHook(hook: NodeFeatureHook): Features[number][] {
			return features.filter((feature) => hook in feature);
		},
		hooks(kind: Features[number]["kind"]): NodeFeatureHook[] {
			const feature = byKind.get(kind);
			if (!feature) return [];
			return NODE_FEATURE_HOOKS.filter((hook) => hook in feature);
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

export type BuiltInFeature = (typeof builtInFeatures)[number];
export type BuiltInFeatureName = BuiltInFeature["kind"];

export const builtInFeatureRegistry = createNodeFeatureRegistry(builtInFeatures);

export function getBuiltInFeature(node: PdfNode): BuiltInFeature | undefined {
	return builtInFeatureRegistry.dispatch(node);
}

export function getBuiltInFeatureKind(node: PdfNode): BuiltInFeatureName | undefined {
	return getBuiltInFeature(node)?.kind;
}

export function getBuiltInFeatureByKind(kind: string): BuiltInFeature | undefined {
	return builtInFeatureRegistry.byKind.get(kind);
}

export function measureRegisteredNodeFeature(
	node: MeasurePdfNode,
	context: NodeMeasureContext,
): MeasuredPdfNode | undefined {
	const feature = getBuiltInFeatureByKind(node._kind);
	if (feature) {
		const measure: NodeMeasureHook = feature.measure;
		return measure(node, context);
	}
	return node._kind === extensionFeature.kind ? extensionFeature.measure(node, context) : undefined;
}

export function measureInlineImageFeature(
	node: MeasuredPdfNode,
	context: NodeMeasureContext,
): MeasuredPdfNode {
	return imageFeature.inline.measure(node, context);
}

export function layoutRegisteredNodeFeature(
	node: LayoutPdfNode,
	context: NodeLayoutContext,
): boolean {
	const feature = getBuiltInFeatureByKind(node._kind);
	if (feature) {
		const layout: NodeLayoutHook = feature.layout;
		layout(node, context);
		return true;
	}
	if (node._kind !== extensionFeature.kind) return false;
	extensionFeature.layout(node, context);
	return true;
}

export function decorateRegisteredNodeFeature(node: LayoutPdfNode): void {
	getBuiltInFeatureByKind(node._kind)?.decorate?.(node);
}

export function resetRegisteredNodeFeature(node: LayoutPdfNode): void {
	getBuiltInFeatureByKind(node._kind)?.reset?.(node);
}

export function placeFeatureItem(
	featureKind: string,
	node: LayoutPdfNode,
	context: NodePlaceContext,
): NodePlaceResult {
	const feature =
		featureKind === extensionFeature.kind
			? extensionFeature
			: getBuiltInFeatureByKind(featureKind);
	if (!feature?.place) {
		throw new Error(`Node feature '${featureKind}' does not support page-item placement`);
	}
	const place: NodePlaceHook = feature.place as NodePlaceHook;
	return place(node, context);
}

export function renderMigratedNodeFeature(
	node: LayoutAttachmentNode | LayoutImageNode,
	document: PDFDocument,
	resetVectorState: () => void,
): boolean {
	if ("attachment" in node) {
		attachmentFeature.render(node, { document });
		return true;
	}
	imageFeature.render(node, { document, resetVectorState });
	return true;
}

export function resolveMigratedFeatureResources(
	document: PrinterDocumentDefinition,
	resolve: (resource: PrinterResourceReference) => string,
): void {
	attachmentFeature.resolveResources(document, resolve);
}
