import type URLResolver from "../resources/url-resolver";
import type { FontDescriptors, PdfCraftExtensions } from "../types";
import type {
	ExtendedResource,
	PrinterDocumentDefinition,
	PrinterResourceReference,
} from "./printer.types";
import { resolveBuiltInPrinterResources } from "../composition/built-in-printer-resources";
import { isResourceReference } from "../services/resources/resource-reference";

function getExtendedUrl(url: PrinterResourceReference): ExtendedResource {
	return typeof url === "object"
		? { url: url.url, headers: url.headers ?? {} }
		: { url, headers: {} };
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

	resolveBuiltInPrinterResources(docDefinition, extensions, resolve);

	if (docDefinition.files) {
		for (const file of Object.values(docDefinition.files)) {
			if (isResourceReference(file.src)) {
				file.src = resolve(file.src);
			}
		}
	}

	await urlResolver.resolved();
}
