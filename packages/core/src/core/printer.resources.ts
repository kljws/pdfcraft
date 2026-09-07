import type URLResolver from "../resources/url-resolver";
import type { ExtensionResourceReference, FontDescriptors, PdfCraftExtensions } from "../types";
import type {
	ExtendedResource,
	PrinterDocumentDefinition,
	PrinterResourceReference,
} from "./printer.types";

function getExtendedUrl(url: PrinterResourceReference): ExtendedResource {
	return typeof url === "object"
		? { url: url.url, headers: url.headers ?? {} }
		: { url, headers: {} };
}

function isResourceReference(resource: unknown): resource is PrinterResourceReference {
	return (
		typeof resource === "string" ||
		(resource !== null &&
			typeof resource === "object" &&
			"url" in resource &&
			typeof resource.url === "string")
	);
}

function resolveFontSource(
	source: FontDescriptors[string][keyof FontDescriptors[string]],
	resolve: (resource: PrinterResourceReference) => string,
): typeof source {
	if (!source) return source;
	if (Array.isArray(source)) {
		source[0] = resolve(source[0]);
		return source;
	}
	return resolve(source);
}

export async function resolvePrinterUrls(
	docDefinition: PrinterDocumentDefinition,
	fontDescriptors: FontDescriptors,
	urlResolver: URLResolver,
	extensions: PdfCraftExtensions = [],
): Promise<void> {
	const resolve = (resource: PrinterResourceReference): string => {
		const url = getExtendedUrl(resource);
		return urlResolver.resolveReference(url.url, url.headers);
	};

	for (const font of Object.values(fontDescriptors)) {
		font.normal = resolveFontSource(font.normal, resolve)!;
		font.bold = resolveFontSource(font.bold, resolve);
		font.italics = resolveFontSource(font.italics, resolve);
		font.bolditalics = resolveFontSource(font.bolditalics, resolve);
	}

	if (docDefinition.images) {
		for (const [name, resource] of Object.entries(docDefinition.images)) {
			docDefinition.images[name] = resolve(resource);
		}
	}

	for (const extension of extensions) {
		extension.resolveResources?.(
			docDefinition as unknown as Record<string, unknown>,
			(resource: ExtensionResourceReference) => resolve(resource as PrinterResourceReference),
		);
	}

	if (docDefinition.attachments) {
		for (const [name, attachment] of Object.entries(docDefinition.attachments)) {
			if (isResourceReference(attachment)) {
				docDefinition.attachments[name] = { src: resolve(attachment) };
			} else if (
				typeof attachment === "object" &&
				"src" in attachment &&
				isResourceReference(attachment.src)
			) {
				attachment.src = resolve(attachment.src);
			}
		}
	}

	if (docDefinition.files) {
		for (const file of Object.values(docDefinition.files)) {
			if (isResourceReference(file.src)) {
				file.src = resolve(file.src);
			}
		}
	}

	await urlResolver.resolved();
}
