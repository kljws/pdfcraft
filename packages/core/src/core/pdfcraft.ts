import Printer from "./printer";
import { VirtualFileSystem as DefaultVirtualFileSystem } from "../resources/virtual-file-system";
import { pack } from "../utils/tools";
import { isObject } from "../utils/variable-type";
import URLResolver from "../resources/url-resolver";
import { cloneDocumentDefinition } from "../utils/clone-document-definition";
import type {
	AccessPolicy,
	CreatePdfOptions,
	Dictionary,
	DocumentDefinition,
	FontDescriptors,
	LocalAccessPolicy,
	PdfCraftExtensions,
	PdfCraftOptions,
	ResourceLoadingOptions,
	TableLayout,
	VirtualFileSystem,
} from "../types";
import type { PdfDocumentStream } from "../output/output-document";

function validateResourceLoading(options: ResourceLoadingOptions): ResourceLoadingOptions {
	const { timeout, maxSize } = options;
	if (
		timeout !== undefined &&
		!(typeof timeout === "number" && timeout > 0 && Number.isFinite(timeout))
	) {
		throw new Error(
			`Invalid resourceLoading.timeout: expected a positive number of milliseconds, received ${String(timeout)}`,
		);
	}
	if (maxSize !== undefined && !(Number.isSafeInteger(maxSize) && maxSize >= 0)) {
		throw new Error(
			`Invalid resourceLoading.maxSize: expected a non-negative integer, received ${String(maxSize)}`,
		);
	}
	// Only defined limits are returned, so a per-document override keeps the instance defaults.
	return {
		...(timeout !== undefined && { timeout }),
		...(maxSize !== undefined && { maxSize }),
	};
}

/**
 * Wraps the generated PDF stream into the output document of a platform, such as the server or
 * browser output. Supplied by platform entry points; document authors never need it.
 */
export type OutputFactory<Output> = (document: Promise<PdfDocumentStream>) => Output;

class PdfCraftBase<Output = unknown> {
	protected virtualfs: VirtualFileSystem;
	protected fonts: FontDescriptors;
	protected tableLayouts: Dictionary<TableLayout>;
	protected progressCallback?: PdfCraftOptions["progressCallback"] | undefined;
	protected urlAccessPolicy?: AccessPolicy | undefined;
	protected localAccessPolicy?: LocalAccessPolicy | undefined;
	protected extensions: PdfCraftExtensions;
	protected resourceLoading: ResourceLoadingOptions;

	private readonly createOutput: OutputFactory<Output>;

	/**
	 * @param createOutput Builds the platform's output document around the PDF stream.
	 * @param options Instance options.
	 */
	constructor(createOutput: OutputFactory<Output>, options: PdfCraftOptions = {}) {
		this.createOutput = createOutput;
		this.virtualfs = options.virtualfs ?? new DefaultVirtualFileSystem();
		this.fonts = options.fonts || {};
		this.tableLayouts = options.tableLayouts || {};
		this.progressCallback = options.progressCallback;
		this.urlAccessPolicy = options.urlAccessPolicy;
		this.localAccessPolicy = options.localAccessPolicy;
		this.extensions = [...(options.extensions ?? [])];
		this.resourceLoading = validateResourceLoading(options.resourceLoading ?? {});
	}

	createPdf(docDefinition: DocumentDefinition, options: CreatePdfOptions = {}): Output {
		if (!isObject(docDefinition)) {
			throw new Error("Parameter 'docDefinition' has an invalid type. Object expected.");
		}

		if (!isObject(options)) {
			throw new Error("Parameter 'options' has an invalid type. Object expected.");
		}
		const validatedOptions = options as CreatePdfOptions;

		const createOptions: CreatePdfOptions = {
			...validatedOptions,
			progressCallback: validatedOptions.progressCallback ?? this.progressCallback,
			tableLayouts: pack(this.tableLayouts, validatedOptions.tableLayouts),
		};

		const urlResolver = new URLResolver(this.virtualfs, {
			...this.resourceLoading,
			...validateResourceLoading(validatedOptions.resourceLoading ?? {}),
			signal: validatedOptions.signal,
		});
		urlResolver.setUrlAccessPolicy(this.urlAccessPolicy);

		const fonts = Object.fromEntries(
			Object.entries(this.fonts).map(([family, descriptor]) => [
				family,
				Object.fromEntries(
					Object.entries(descriptor).map(([style, source]) => [
						style,
						Array.isArray(source)
							? [...source]
							: typeof source === "object"
								? { ...source }
								: source,
					]),
				),
			]),
		) as FontDescriptors;
		const printer = new Printer(
			fonts,
			this.virtualfs,
			urlResolver,
			this.localAccessPolicy,
			this.extensions,
		);
		const pdfDocumentPromise = printer.createPdfKitDocument(
			cloneDocumentDefinition(docDefinition),
			createOptions,
		);

		return this.createOutput(pdfDocumentPromise);
	}

	setUrlAccessPolicy(callback?: AccessPolicy): void {
		if (callback !== undefined && typeof callback !== "function") {
			throw new Error("Parameter 'callback' has an invalid type. Function or undefined expected.");
		}

		this.urlAccessPolicy = callback;
	}

	setProgressCallback(callback?: PdfCraftOptions["progressCallback"]): void {
		this.progressCallback = callback;
	}

	addTableLayouts(tableLayouts: Dictionary<TableLayout>): void {
		this.tableLayouts = pack(this.tableLayouts, tableLayouts);
	}

	setTableLayouts(tableLayouts: Dictionary<TableLayout>): void {
		this.tableLayouts = tableLayouts;
	}

	clearTableLayouts(): void {
		this.tableLayouts = {};
	}

	addFonts(fonts: FontDescriptors): void {
		this.fonts = pack(this.fonts, fonts);
	}

	setFonts(fonts: FontDescriptors): void {
		this.fonts = fonts;
	}

	clearFonts(): void {
		this.fonts = {};
	}

	addExtensions(...extensions: PdfCraftExtensions): void {
		const names = new Set(extensions.map((extension) => extension.name));
		this.extensions = [
			...this.extensions.filter((extension) => !names.has(extension.name)),
			...extensions,
		];
	}

	setExtensions(extensions: PdfCraftExtensions): void {
		this.extensions = [...extensions];
	}
}

export default PdfCraftBase;
