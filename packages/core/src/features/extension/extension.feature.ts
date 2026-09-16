import type { ExtensionNode, ExtensionResourceReference, PdfCraftExtensions } from "../../types";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { copyExtensionPageBreakProperties } from "./extension-page-break";
import { findExtensionForNode } from "./extension-registry";
import { layoutExtension, type ExtensionLayoutContext } from "./layout-extension";
import { measureExtension, type ExtensionMeasureHost } from "./measure-extension";
import { placeExtension, type ExtensionWriter } from "./place-extension";
import { renderExtension, type ExtensionRenderHost } from "./render-extension";
import { resolveExtensionResources } from "./resolve-extension-resources";

export const extensionFeature = {
	kind: "extension",
	matches(node: PreprocessedPdfNode, extensions: PdfCraftExtensions): boolean {
		return Boolean(findExtensionForNode(node as ExtensionNode, extensions));
	},
	resolveResources(
		documentDefinition: ExtensionNode,
		extensions: PdfCraftExtensions,
		resolve: (resource: ExtensionResourceReference) => string,
	): void {
		resolveExtensionResources(documentDefinition, extensions, resolve);
	},
	measure(node: MeasuredPdfNode, host: ExtensionMeasureHost): MeasuredPdfNode | undefined {
		return measureExtension(node, host);
	},
	place(
		writer: ExtensionWriter,
		node: LayoutPdfNode,
		index?: number,
	): ReturnType<typeof placeExtension> {
		return placeExtension(writer, node, index);
	},
	layout(node: LayoutPdfNode, context: ExtensionLayoutContext): void {
		layoutExtension(node, context);
	},
	render(node: LayoutPdfNode, host: ExtensionRenderHost): void {
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
