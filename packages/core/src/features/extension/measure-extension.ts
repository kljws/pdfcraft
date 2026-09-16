import type StyleContextStack from "../../services/styles/style-context-stack";
import type PDFDocument from "../../rendering/pdf-document";
import type { ExtensionNode, PdfCraftExtensions } from "../../types";
import type { MeasuredPdfNode } from "../../types/internal";
import { measureBox } from "../../services/measurement/measure-box";
import { findExtensionForNode } from "./extension-registry";

export interface ExtensionMeasureHost {
	document: PDFDocument;
	styles: StyleContextStack;
	extensions: PdfCraftExtensions;
}

export function measureExtension(
	node: MeasuredPdfNode,
	host: ExtensionMeasureHost,
): MeasuredPdfNode | undefined {
	const extension = findExtensionForNode(node as ExtensionNode, host.extensions);
	if (!extension) return undefined;

	node._extension = extension.name;
	extension.measure(node as ExtensionNode, {
		documentDefinition: host.document.extensionDocument ?? {},
		virtualFileSystem: host.document.virtualfs,
		getStyle: (property) => host.styles.getProperty(property),
		measureBox: (dimensions) => measureBox(node, dimensions, host.styles),
	});
	return node;
}
