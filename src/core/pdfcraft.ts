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
	PdfCraftOptions,
	TableLayout,
	VirtualFileSystem,
} from "../types";
import type { PdfDocumentStream } from "../output/output-document";

class PdfCraftBase<Output = unknown> {
	protected virtualfs: VirtualFileSystem;
	protected fonts: FontDescriptors;
	protected tableLayouts: Dictionary<TableLayout>;
	protected progressCallback?: PdfCraftOptions["progressCallback"];
	protected urlAccessPolicy?: AccessPolicy;
	protected localAccessPolicy?: LocalAccessPolicy;

	constructor(options: PdfCraftOptions = {}) {
		this.virtualfs = options.virtualfs ?? new DefaultVirtualFileSystem();
		this.fonts = options.fonts || {};
		this.tableLayouts = options.tableLayouts || {};
		this.progressCallback = options.progressCallback;
		this.urlAccessPolicy = options.urlAccessPolicy;
		this.localAccessPolicy = options.localAccessPolicy;
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

		const runtime = globalThis as { process?: { versions?: { node?: string } } };
		const isServer = Boolean(runtime.process?.versions?.node);
		if (typeof this.urlAccessPolicy === "undefined" && isServer) {
			console.warn(
				"No URL access policy defined. Consider using setUrlAccessPolicy() to restrict external resource downloads.",
			);
		}
		if (typeof this.localAccessPolicy === "undefined" && isServer) {
			console.warn(
				"No local access policy defined. Consider using setLocalAccessPolicy() to restrict local file system access.",
			);
		}

		let urlResolver = new URLResolver(this.virtualfs);
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
		let printer = new Printer(fonts, this.virtualfs, urlResolver, this.localAccessPolicy);
		const pdfDocumentPromise = printer.createPdfKitDocument(
			cloneDocumentDefinition(docDefinition),
			createOptions,
		);

		return this._transformToDocument(pdfDocumentPromise);
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

	_transformToDocument(doc: Promise<PdfDocumentStream>): Output {
		return doc as Output;
	}
}

export default PdfCraftBase;
