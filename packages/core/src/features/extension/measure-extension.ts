import type StyleContextStack from "../../services/styles/style-context-stack";
import type PDFDocument from "../../rendering/pdf-document";
import type { PdfCraftExtensions } from "../../types";
import { measureBox } from "../../services/measurement/measure-box";
import { findExtensionForNode } from "./extension-registry";
import type { ExtensionMeasureNode, MeasuredExtensionNode } from "./extension.types";

export interface ExtensionMeasureHost {
	document: PDFDocument;
	styles: StyleContextStack;
	extensions: PdfCraftExtensions;
}

export function measureExtension(
	node: ExtensionMeasureNode,
	host: ExtensionMeasureHost,
): MeasuredExtensionNode | undefined {
	const extension = findExtensionForNode(node, host.extensions);
	if (!extension) return undefined;

	node._extension = extension.name;
	extension.measure(node, {
		documentDefinition: host.document.extensionDocument ?? {},
		virtualFileSystem: host.document.virtualfs,
		getStyle: (property) => host.styles.getProperty(property),
		measureBox: (dimensions) => measureBox(node, dimensions, host.styles),
	});
	return node as MeasuredExtensionNode;
}
