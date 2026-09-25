import type { PdfCraftExtensions } from "../../types";
import type { LayoutPdfNode } from "../../types/internal";
import { findExtensionByName } from "./extension-registry";

export function copyExtensionPageBreakProperties(
	node: LayoutPdfNode,
	target: Record<string, unknown>,
	extensions: PdfCraftExtensions,
): void {
	if (node._kind !== "extension") return;
	const extension = findExtensionByName(node._extension, extensions);
	for (const key of extension?.pageBreakKeys ?? []) {
		if (node[key] !== undefined) target[key] = node[key];
	}
}
