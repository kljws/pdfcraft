import type { AttachmentResourceContext } from "../features/attachment/attachment.feature";
import { getResolvedAttachments } from "../features/attachment/attachment-resources";
import type { ExtensionResourceContext } from "../features/extension/extension.feature";
import type { PrinterDocumentDefinition, PrinterResourceReference } from "../core/printer.types";
import type { PdfCraftExtensions } from "../types";
import { resolveFeatureResources } from "./built-in-feature-registry";

type BuiltInResourceContext = AttachmentResourceContext & ExtensionResourceContext;

export function resolveBuiltInPrinterResources(
	document: PrinterDocumentDefinition,
	extensions: PdfCraftExtensions,
	resolve: (resource: PrinterResourceReference) => string,
): void {
	resolveFeatureResources<PrinterDocumentDefinition, BuiltInResourceContext>(document, {
		extensions,
		resolve: (resource) => resolve(resource as PrinterResourceReference),
	});
}

export const getBuiltInResolvedAttachments = getResolvedAttachments;
