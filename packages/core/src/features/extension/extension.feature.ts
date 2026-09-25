import { markNodeKind } from "../../utils/node";
import type { ExtensionNode, ExtensionResourceReference, PdfCraftExtensions } from "../../types";
import type { LayoutPdfNode, MeasurePdfNode, PdfNode } from "../../types/internal";
import type {
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import type {
	ExtensionMeasureNode,
	LayoutExtensionNode,
	MeasuredExtensionNode,
	PreprocessedExtensionNode,
} from "./extension.types";
import { copyExtensionPageBreakProperties } from "./extension-page-break";
import { findExtensionForNode } from "./extension-registry";
import { layoutExtension } from "./layout-extension";
import { measureExtension } from "./measure-extension";
import { placeExtensionItem } from "./place-extension";
import { renderExtension, type ExtensionRenderHost } from "./render-extension";
import { resolveExtensionResources } from "./resolve-extension-resources";

export interface ExtensionResourceContext {
	extensions: PdfCraftExtensions;
	resolve(resource: ExtensionResourceReference): string;
}

export const extensionFeature = {
	kind: "extension",
	matches(node: PdfNode, extensions: PdfCraftExtensions): boolean {
		return Boolean(findExtensionForNode(node as ExtensionNode, extensions));
	},
	preprocess(node: PdfNode): PreprocessedExtensionNode {
		return markNodeKind(node, "extension");
	},
	resolveResources(documentDefinition: ExtensionNode, context: ExtensionResourceContext): void {
		resolveExtensionResources(documentDefinition, context.extensions, context.resolve);
	},
	measure(node: MeasurePdfNode, context: NodeMeasureContext): MeasuredExtensionNode | undefined {
		return measureExtension(node as ExtensionMeasureNode, {
			document: context.document,
			styles: context.styles,
			extensions: context.extensions,
		});
	},
	place(
		node: LayoutExtensionNode,
		context: NodePlaceContext,
	): ReturnType<typeof placeExtensionItem> {
		return placeExtensionItem(node, context);
	},
	layout(node: LayoutExtensionNode, context: NodeLayoutContext): void {
		layoutExtension(node, { writer: context.writer });
	},
	render(node: LayoutExtensionNode, host: ExtensionRenderHost): void {
		renderExtension(node, host);
	},
	copyPageBreakProperties(
		node: LayoutPdfNode,
		target: Record<string, unknown>,
		extensions: PdfCraftExtensions,
	): void {
		copyExtensionPageBreakProperties(node, target, extensions);
	},
};
