import { withoutUndefined } from "../utils/defined";
import PDFDocument from "../rendering/pdf-document";
import LayoutBuilder from "../layout/layout-builder";
import {
	assertUsableContentArea,
	normalizePageSize,
	normalizePageMargin,
} from "../configuration/page-size";
import { tableLayouts } from "../configuration/table-layouts";
import Renderer from "../rendering/renderer";
import type { RenderablePage } from "../rendering/renderer.types";
import { isNumber, isValue } from "../utils/variable-type";
import { convertToDynamicContent } from "../utils/tools";
import type {
	FontDescriptors,
	LocalAccessPolicy,
	PdfCraftExtensions,
	VirtualFileSystem,
} from "../types";
import type URLResolver from "../resources/url-resolver";
import type {
	PdfKitCreationOptions,
	PrinterDocumentDefinition,
	PrinterOptions,
} from "./printer.types";
import { createMetadata, embedFiles, getResolvedImages } from "./printer.helpers";
import { resolvePrinterUrls } from "./printer.resources";
import { getBuiltInResolvedAttachments } from "../composition/built-in-printer-resources";

/** Validated `xmpMetadata` fragments; PDF 1.3 documents have no XMP metadata stream to extend. */
function getXmpFragments(docDefinition: PrinterDocumentDefinition): readonly string[] {
	const { xmpMetadata } = docDefinition;
	if (xmpMetadata === undefined) return [];
	const fragments = typeof xmpMetadata === "string" ? [xmpMetadata] : xmpMetadata;
	if (!Array.isArray(fragments) || fragments.some((fragment) => typeof fragment !== "string")) {
		throw new Error("Invalid xmpMetadata: expected a string or an array of strings");
	}
	if (docDefinition.version === "1.3") {
		throw new Error(
			"Invalid xmpMetadata: PDF version 1.3 has no XMP metadata; set 'version' to 1.4 or later",
		);
	}
	return fragments;
}

class PdfPrinter {
	readonly fontDescriptors: FontDescriptors;
	readonly virtualfs: VirtualFileSystem;
	readonly urlResolver: URLResolver;
	readonly localAccessPolicy?: LocalAccessPolicy | undefined;
	readonly extensions: PdfCraftExtensions;
	pdfKitDoc!: PDFDocument;

	/**
	 * @param fontDescriptors font definition dictionary
	 * @param virtualfs
	 * @param urlResolver
	 * @param localAccessPolicy
	 */
	constructor(
		fontDescriptors: FontDescriptors,
		virtualfs: VirtualFileSystem,
		urlResolver: URLResolver,
		localAccessPolicy?: LocalAccessPolicy | undefined,
		extensions: PdfCraftExtensions = [],
	) {
		this.fontDescriptors = fontDescriptors;
		this.virtualfs = virtualfs;
		this.urlResolver = urlResolver;
		this.localAccessPolicy = localAccessPolicy;
		this.extensions = extensions;
	}

	/**
	 * Executes layout engine for the specified document and renders it into a pdfkit document
	 * ready to be saved.
	 *
	 * @param docDefinition
	 * @param options
	 * @returns resolved promise return a pdfkit document
	 */
	async createPdfKitDocument(
		docDefinition: PrinterDocumentDefinition,
		options: PrinterOptions = {},
	): Promise<PDFDocument> {
		await this.resolveUrls(docDefinition);

		docDefinition.version = docDefinition.version || "1.3";
		docDefinition.subset = docDefinition.subset || undefined;
		docDefinition.tagged = typeof docDefinition.tagged === "boolean" ? docDefinition.tagged : false;
		docDefinition.displayTitle =
			typeof docDefinition.displayTitle === "boolean" ? docDefinition.displayTitle : false;
		docDefinition.compress =
			typeof docDefinition.compress === "boolean" ? docDefinition.compress : true;
		docDefinition.images = docDefinition.images || {};
		docDefinition.attachments = docDefinition.attachments || {};
		docDefinition.pageMargins = isValue(docDefinition.pageMargins) ? docDefinition.pageMargins : 40;
		docDefinition.patterns = docDefinition.patterns || {};

		if (docDefinition.header && typeof docDefinition.header !== "function") {
			docDefinition.header = convertToDynamicContent(docDefinition.header);
		}

		if (docDefinition.footer && typeof docDefinition.footer !== "function") {
			docDefinition.footer = convertToDynamicContent(docDefinition.footer);
		}

		const pageSize = normalizePageSize(docDefinition.pageSize, docDefinition.pageOrientation);

		const pdfOptions: PdfKitCreationOptions = withoutUndefined({
			size: [pageSize.width, pageSize.height] satisfies [number, number],
			pdfVersion: docDefinition.version,
			subset: docDefinition.subset,
			tagged: docDefinition.tagged,
			displayTitle: docDefinition.displayTitle,
			compress: docDefinition.compress,
			userPassword: docDefinition.userPassword,
			ownerPassword: docDefinition.ownerPassword,
			permissions: docDefinition.permissions,
			lang: docDefinition.language,
			fontLayoutCache:
				typeof options.fontLayoutCache === "boolean" ? options.fontLayoutCache : true,
			bufferPages: options.bufferPages || false,
			autoFirstPage: false,
			info: createMetadata(docDefinition),
			font: null,
		});

		this.pdfKitDoc = new PDFDocument(
			this.fontDescriptors,
			getResolvedImages(docDefinition.images),
			docDefinition.patterns,
			getBuiltInResolvedAttachments(docDefinition.attachments),
			pdfOptions,
			this.virtualfs,
			this.localAccessPolicy,
			docDefinition as unknown as Record<string, unknown>,
		);
		embedFiles(docDefinition, this.pdfKitDoc);
		this.pdfKitDoc.xmpFragments = getXmpFragments(docDefinition);

		const pageMargins =
			typeof docDefinition.pageMargins === "function"
				? docDefinition.pageMargins
				: normalizePageMargin(docDefinition.pageMargins);
		if (typeof pageMargins !== "function") {
			assertUsableContentArea(pageSize, pageMargins, "pageMargins");
		}
		const builder = new LayoutBuilder(pageSize, pageMargins, this.extensions);

		builder.registerTableLayouts(tableLayouts);
		if (options.tableLayouts) {
			builder.registerTableLayouts(options.tableLayouts);
		}

		let pages = builder.layoutDocument(
			docDefinition.content,
			this.pdfKitDoc,
			docDefinition.styles || {},
			docDefinition.defaultStyle || { fontSize: 12, font: "Roboto" },
			docDefinition.background,
			docDefinition.header,
			docDefinition.footer,
			docDefinition.watermark,
			docDefinition.pageBreakBefore
				? (currentNode, helpers) =>
						docDefinition.pageBreakBefore!(
							currentNode,
							helpers.getFollowingNodesOnPage(),
							helpers.getNodesOnNextPage(),
							helpers.getPreviousNodesOnPage(),
						)
				: undefined,
		);
		const totalPageCount = pages.length;
		const maxNumberPages = docDefinition.maxPagesNumber ?? -1;
		if (isNumber(maxNumberPages) && maxNumberPages > -1) {
			pages = pages.slice(0, maxNumberPages);
		}
		this.pdfKitDoc.pdfCraftPageInfo = {
			pageCount: pages.length,
			totalPageCount,
			truncated: pages.length < totalPageCount,
		};

		const renderer = new Renderer(this.pdfKitDoc, options.progressCallback, this.extensions);
		renderer.renderPages(pages as RenderablePage[]);

		return this.pdfKitDoc;
	}

	async resolveUrls(docDefinition: PrinterDocumentDefinition): Promise<void> {
		await resolvePrinterUrls(
			docDefinition,
			this.fontDescriptors,
			this.urlResolver,
			this.extensions,
		);
	}
}

export default PdfPrinter;
