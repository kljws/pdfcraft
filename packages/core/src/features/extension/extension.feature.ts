import { markNodeKind } from "../../utils/node";
import type { ExtensionNode, ExtensionResourceReference, PdfCraftExtensions } from "../../types";
import type { LayoutPdfNode, PdfNode } from "../../types/internal";
import type {
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import { layoutFeatureItem } from "../../layout/element-writer.helpers";
import type {
	ExtensionMeasureNode,
	LayoutExtensionNode,
	MeasuredExtensionNode,
	PreprocessedExtensionNode,
} from "./extension.types";
import { findExtensionByName, findExtensionForNode } from "./extension-registry";
import { measureExtension } from "./measure-extension";
import { placeExtensionItem } from "./place-extension";
import { renderExtension, type ExtensionRenderHost } from "./render-extension";

export interface ExtensionResourceContext {
	extensions: PdfCraftExtensions;
	resolve(resource: ExtensionResourceReference): string;
}

export const extensionFeature = {
	kind: "extension",
	matches(node: PdfNode, extensions: PdfCraftExtensions): boolean {
		return Boolean(findExtensionForNode(node, extensions));
	},
	preprocess(node: PdfNode): PreprocessedExtensionNode {
		return markNodeKind(node, "extension");
	},
	resolveResources(documentDefinition: ExtensionNode, context: ExtensionResourceContext): void {
		for (const extension of context.extensions) {
			extension.resolveResources?.(documentDefinition, context.resolve);
		}
	},
	measure(node: ExtensionMeasureNode, context: NodeMeasureContext): MeasuredExtensionNode | undefined {
		return measureExtension(node, {
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
		layoutFeatureItem("extension", node, context.writer);
	},
	render(node: LayoutExtensionNode, host: ExtensionRenderHost): void {
		renderExtension(node, host);
	},
	copyPageBreakProperties(
		node: LayoutPdfNode,
		target: Record<string, unknown>,
		extensions: PdfCraftExtensions,
	): void {
		if (node._kind !== "extension") return;
		const extension = findExtensionByName(node._extension, extensions);
		for (const key of extension?.pageBreakKeys ?? []) {
			if (node[key] !== undefined) target[key] = node[key];
		}
	},
};
