import type { AttachmentResourceContext } from "../features/attachment/attachment.feature";
import { getResolvedAttachments } from "../features/attachment/attachment-resources";
import type { ExtensionResourceContext } from "../features/extension/extension.feature";
import type { PdfCraftExtensions, ResourceSource } from "../types";
import type { PrinterDocumentDefinition } from "../types/internal";
import { resolveFeatureResources } from "./built-in-feature-registry";

type BuiltInResourceContext = AttachmentResourceContext & ExtensionResourceContext;

export function resolveBuiltInPrinterResources(
	document: PrinterDocumentDefinition,
	extensions: PdfCraftExtensions,
	resolve: (resource: ResourceSource) => string,
): void {
	resolveFeatureResources<PrinterDocumentDefinition, BuiltInResourceContext>(document, {
		extensions,
		resolve: (resource) => resolve(resource as ResourceSource),
	});
}

export const getBuiltInResolvedAttachments = getResolvedAttachments;
