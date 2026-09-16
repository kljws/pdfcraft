import type { ExtensionNode, PdfCraftExtension, PdfCraftExtensions } from "../../types";

export function findExtensionForNode(
	node: ExtensionNode,
	extensions: PdfCraftExtensions,
): PdfCraftExtension | undefined {
	return extensions.find((extension) => extension.test(node));
}

export function findExtensionByName(
	name: string | undefined,
	extensions: PdfCraftExtensions,
): PdfCraftExtension | undefined {
	return extensions.find((extension) => extension.name === name);
}
