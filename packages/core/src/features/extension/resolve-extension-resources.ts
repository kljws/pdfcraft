import type { ExtensionNode, ExtensionResourceReference, PdfCraftExtensions } from "../../types";

export function resolveExtensionResources(
	documentDefinition: ExtensionNode,
	extensions: PdfCraftExtensions,
	resolve: (resource: ExtensionResourceReference) => string,
): void {
	for (const extension of extensions) {
		extension.resolveResources?.(documentDefinition, resolve);
	}
}
