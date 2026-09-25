import type PDFDocument from "../../rendering/pdf-document";
import { addPageLink, findFont } from "../../rendering/renderer.helpers";
import type { PdfCraftExtensions } from "../../types";
import type { LayoutExtensionNode } from "./extension.types";
import { findExtensionByName } from "./extension-registry";

export interface ExtensionRenderContext {
	document: PDFDocument;
	extensions: PdfCraftExtensions;
}

export function renderExtension(node: LayoutExtensionNode, context: ExtensionRenderContext): void {
	const extension = findExtensionByName(node._extension, context.extensions);
	if (!extension?.render) {
		throw new Error(`No renderer registered for extension '${node._extension ?? "unknown"}'`);
	}

	extension.render({
		document: context.document,
		node,
		resolveFont: (family, bold, italic, fallback) => {
			const fontFamilies = family
				.split(",")
				.map((fontName) => fontName.trim().replace(/('|")/g, ""));
			const font = findFont(context.document.fonts, fontFamilies, fallback);
			const fontFile = context.document.getFontFile(font, bold, italic);
			if (fontFile === null) {
				const type = context.document.getFontType(bold, italic);
				throw new Error(
					`Font '${font}' in style '${type}' is not defined in the font section of the document definition.`,
				);
			}
			return (Array.isArray(fontFile) ? fontFile[0] : fontFile) as string;
		},
	});

	if (node.link) {
		context.document.link(node.x!, node.y!, node._width!, node._height!, node.link);
	}
	if (node.linkToPage) {
		addPageLink(context.document, node.x!, node.y!, node._width!, node._height!, node.linkToPage);
	}
	if (node.linkToDestination) {
		context.document.goTo(node.x!, node.y!, node._width!, node._height!, node.linkToDestination);
	}
}
