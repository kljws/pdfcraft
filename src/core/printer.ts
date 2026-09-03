import PDFDocument from "../rendering/pdf-document";
import LayoutBuilder from "../layout/layout-builder";
import SVGMeasure from "../measurement/svg-measure";
import { normalizePageSize, normalizePageMargin } from "../configuration/page-size";
import { tableLayouts } from "../configuration/table-layouts";
import Renderer from "../rendering/renderer";
import type { RenderablePage } from "../rendering/renderer.types";
import { isNumber, isValue } from "../utils/variable-type";
import { convertToDynamicContent } from "../utils/tools";
import type { FontDescriptors, LocalAccessPolicy, VirtualFileSystem } from "../types";
import type URLResolver from "../resources/url-resolver";
import type {
	PdfKitCreationOptions,
	PrinterDocumentDefinition,
	PrinterOptions,
} from "./printer.types";
import {
	createMetadata,
	embedFiles,
	getResolvedAttachments,
	getResolvedImages,
	getResolvedSvgs,
} from "./printer.helpers";
import { resolvePrinterUrls } from "./printer.resources";

class PdfPrinter {
	readonly fontDescriptors: FontDescriptors;
	readonly virtualfs: VirtualFileSystem;
	readonly urlResolver: URLResolver;
	readonly localAccessPolicy?: LocalAccessPolicy;
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
		localAccessPolicy?: LocalAccessPolicy,
	) {
		this.fontDescriptors = fontDescriptors;
		this.virtualfs = virtualfs;
		this.urlResolver = urlResolver;
		this.localAccessPolicy = localAccessPolicy;
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
		docDefinition.svgs = docDefinition.svgs || {};
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

		const pdfOptions: PdfKitCreationOptions = {
			size: [pageSize.width, pageSize.height],
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
		};

		this.pdfKitDoc = new PDFDocument(
			this.fontDescriptors,
			getResolvedImages(docDefinition.images),
			docDefinition.patterns,
			getResolvedAttachments(docDefinition.attachments),
			pdfOptions,
			this.virtualfs,
			this.localAccessPolicy,
			getResolvedSvgs(docDefinition.svgs),
		);
		embedFiles(docDefinition, this.pdfKitDoc);

		const pageMargins =
			typeof docDefinition.pageMargins === "function"
				? docDefinition.pageMargins
				: normalizePageMargin(docDefinition.pageMargins);
		const builder = new LayoutBuilder(pageSize, pageMargins, new SVGMeasure());

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
		const maxNumberPages = docDefinition.maxPagesNumber ?? -1;
		if (isNumber(maxNumberPages) && maxNumberPages > -1) {
			pages = pages.slice(0, maxNumberPages);
		}

		const renderer = new Renderer(this.pdfKitDoc, options.progressCallback);
		renderer.renderPages(pages as RenderablePage[]);

		return this.pdfKitDoc;
	}

	async resolveUrls(docDefinition: PrinterDocumentDefinition): Promise<void> {
		await resolvePrinterUrls(docDefinition, this.fontDescriptors, this.urlResolver);
	}
}

export default PdfPrinter;
