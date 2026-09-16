import type { ExtensionNode, PdfCraftExtensions } from "../../types";
import type { LayoutPdfNode } from "../../types/internal";
import { findExtensionByName } from "./extension-registry";

export function copyExtensionPageBreakProperties(
	node: LayoutPdfNode,
	target: Record<string, unknown>,
	extensions: PdfCraftExtensions,
): void {
	const extension = findExtensionByName(node._extension, extensions);
	const extensionNode = node as unknown as ExtensionNode;
	for (const key of extension?.pageBreakKeys ?? []) {
		if (extensionNode[key] !== undefined) target[key] = extensionNode[key];
	}
}
