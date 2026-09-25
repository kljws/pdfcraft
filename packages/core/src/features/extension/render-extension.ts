import type PDFDocument from "../../rendering/pdf-document";
import { addPageLink, findFont } from "../../rendering/renderer.helpers";
import type { PdfCraftExtensions } from "../../types";
import type { LayoutExtensionNode } from "./extension.types";
import { findExtensionByName } from "./extension-registry";

export interface ExtensionRenderHost {
	document: PDFDocument;
	extensions: PdfCraftExtensions;
}

export function renderExtension(node: LayoutExtensionNode, host: ExtensionRenderHost): void {
	const extension = findExtensionByName(node._extension, host.extensions);
	if (!extension?.render) {
		throw new Error(`No renderer registered for extension '${node._extension ?? "unknown"}'`);
	}

	extension.render({
		document: host.document,
		node,
		resolveFont: (family, bold, italic, fallback) => {
			const fontFamilies = family
				.split(",")
				.map((fontName) => fontName.trim().replace(/('|")/g, ""));
			const font = findFont(host.document.fonts, fontFamilies, fallback);
			const fontFile = host.document.getFontFile(font, bold, italic);
			if (fontFile === null) {
				const type = host.document.getFontType(bold, italic);
				throw new Error(
					`Font '${font}' in style '${type}' is not defined in the font section of the document definition.`,
				);
			}
			return (Array.isArray(fontFile) ? fontFile[0] : fontFile) as string;
		},
	});

	if (node.link) {
		host.document.link(node.x!, node.y!, node._width!, node._height!, node.link);
	}
	if (node.linkToPage) {
		addPageLink(host.document, node.x!, node.y!, node._width!, node._height!, node.linkToPage);
	}
	if (node.linkToDestination) {
		host.document.goTo(node.x!, node.y!, node._width!, node._height!, node.linkToDestination);
	}
}
