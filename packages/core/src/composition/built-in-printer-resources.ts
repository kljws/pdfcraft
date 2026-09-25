import { getResolvedAttachments } from "../features/attachment/attachment-resources";
import { extensionFeature } from "../features/extension/extension.feature";
import type { PrinterDocumentDefinition, PrinterResourceReference } from "../core/printer.types";
import type { PdfCraftExtensions } from "../types";
import { resolveMigratedFeatureResources } from "./built-in-feature-registry";

export function resolveBuiltInPrinterResources(
	document: PrinterDocumentDefinition,
	extensions: PdfCraftExtensions,
	resolve: (resource: PrinterResourceReference) => string,
): void {
	extensionFeature.resolveResources(
		document as unknown as Record<string, unknown>,
		extensions,
		(resource) => resolve(resource as PrinterResourceReference),
	);
	resolveMigratedFeatureResources(document, resolve);
}

export const getBuiltInResolvedAttachments = getResolvedAttachments;
