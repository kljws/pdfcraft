import { createBuiltInRendering, type BuiltInRendering } from "../composition/built-in-rendering";
import type { PdfCraftExtensions } from "../types";
import type { LineLike } from "../types/internal";
import RendererGraphics from "./renderer.graphics";
import type PDFDocument from "./pdf-document";
import type { ClipRectangle, RenderablePage, VerticalAlignmentItem } from "./renderer.types";
import type { LayoutAcroFormNode } from "../features/acroform/acroform.types";

class Renderer {
	private readonly pdfDocument: PDFDocument;
	private readonly graphics: RendererGraphics;
	private readonly progressCallback: ((progress: number) => void) | undefined;
	private readonly outlineMap: Record<string, PDFKit.PDFOutline> = {};
	private readonly rendering: BuiltInRendering;

	constructor(
		pdfDocument: PDFDocument,
		progressCallback?: (progress: number) => void,
		extensions: PdfCraftExtensions = [],
	) {
		this.pdfDocument = pdfDocument;
		this.rendering = createBuiltInRendering(pdfDocument, extensions);
		this.graphics = new RendererGraphics(pdfDocument, extensions, this.rendering.graphics);
		this.progressCallback = progressCallback;
	}

	renderPages(pages: RenderablePage[]): void {
		this.pdfDocument._pdfCraftPages = pages;

		const totalItems = this.progressCallback
			? pages.reduce((total, page) => total + page.items.length, 0)
			: 0;
		let renderedItems = 0;

		for (const page of pages) {
			this.pdfDocument.addPage({ size: [page.pageSize.width, page.pageSize.height] });
			this.graphics.beginPage();

			for (const item of page.items) {
				if (item.type !== "vector") {
					this.graphics.prepareNonVectorItem();
				}

				switch (item.type) {
					case "vector":
						this.graphics.renderVector(item.item);
						break;
					case "line":
						this.renderLine(item.item, item.item.x ?? 0, item.item.y ?? 0);
						break;
					case "image":
						this.graphics.renderImage(item.item);
						break;
					case "extension":
						this.graphics.renderExtension(item.item);
						break;
					case "attachment":
						this.graphics.renderAttachment(item.item);
						break;
					case "acroform":
						this.rendering.renderAcroForm(
							item.item as LayoutAcroFormNode,
							item.item.x ?? 0,
							item.item.y ?? 0,
						);
						break;
					case "beginClip":
						this.graphics.beginClip(item.item as ClipRectangle);
						break;
					case "endClip":
						this.graphics.endClip();
						break;
					case "beginVerticalAlignment":
						this.graphics.beginVerticalAlignment(item.item as VerticalAlignmentItem);
						break;
					case "endVerticalAlignment":
						this.graphics.endVerticalAlignment(item.item as VerticalAlignmentItem);
						break;
				}

				renderedItems++;
				this.progressCallback?.(renderedItems / totalItems);
			}

			this.graphics.endPage();

			if (page.watermark) {
				this.graphics.renderWatermark(page);
			}
		}
	}

	renderLine(line: LineLike, x: number, y: number): void {
		this.rendering.renderLine(line, this.outlineMap, x, y);
	}
}

export default Renderer;
