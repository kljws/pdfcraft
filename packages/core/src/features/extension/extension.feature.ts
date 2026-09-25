import { markNodeKind } from "../../utils/node";
import type { ExtensionNode, ExtensionResourceReference, PdfCraftExtensions } from "../../types";
import type { CurrentPosition, LayoutPdfNode, PdfNode } from "../../types/internal";
import type {
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import {
	addPageItem,
	alignImage,
	canPlaceOnCurrentPage,
	layoutFeatureItem,
} from "../../layout/element-writer.helpers";
import { measureBox } from "../../services/measurement/measure-box";
import type {
	ExtensionMeasureNode,
	LayoutExtensionNode,
	MeasuredExtensionNode,
	PreprocessedExtensionNode,
} from "./extension.types";
import { findExtensionByName, findExtensionForNode } from "./extension-registry";
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
		const extension = findExtensionForNode(node, context.extensions);
		if (!extension) return undefined;

		node._extension = extension.name;
		extension.measure(node, {
			documentDefinition: context.document.extensionDocument ?? {},
			virtualFileSystem: context.document.virtualfs,
			getStyle: (property) => context.styles.getProperty(property),
			measureBox: (dimensions) => measureBox(node, dimensions, context.styles),
		});
		return node as MeasuredExtensionNode;
	},
	place(node: LayoutExtensionNode, { writer, index }: NodePlaceContext): CurrentPosition | false {
		const height = node._height ?? 0;
		const context = writer.context();
		const page = context.getCurrentPage();
		const position = writer.getCurrentPositionOnPage();

		if (!canPlaceOnCurrentPage(node, height, page, context.availableHeight)) return false;

		node._x ??= node.x || 0;
		node.x = context.x + node._x;
		node.y = context.y;
		alignImage(node, context.availableWidth);
		addPageItem(page, { type: "extension", item: node }, index);
		context.moveDown(height);
		return position;
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
