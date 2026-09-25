import { createBuiltInRendering, type BuiltInRendering } from "../composition/built-in-rendering";
import type { PdfCraftExtensions } from "../types";
import type { LayoutPdfNode, LineLike, Vector } from "../types/internal";
import ClippingRenderer from "./clipping-renderer";
import type PDFDocument from "./pdf-document";
import type { ClipRectangle, RenderablePage, VerticalAlignmentItem } from "./renderer.types";
import { beginVerticalAlignment, endVerticalAlignment } from "./render-vertical-alignment";
import VectorRenderer from "./vector-renderer";

class Renderer {
	private readonly pdfDocument: PDFDocument;
	private readonly progressCallback: ((progress: number) => void) | undefined;
	private readonly outlineMap: Record<string, PDFKit.PDFOutline> = {};
	private readonly rendering: BuiltInRendering;
	private readonly vectors: VectorRenderer;
	private readonly clipping: ClippingRenderer;

	constructor(
		pdfDocument: PDFDocument,
		progressCallback?: (progress: number) => void,
		extensions: PdfCraftExtensions = [],
	) {
		this.pdfDocument = pdfDocument;
		this.rendering = createBuiltInRendering(pdfDocument, extensions);
		this.vectors = new VectorRenderer(pdfDocument);
		this.clipping = new ClippingRenderer(pdfDocument, () => this.resetVectorState());
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
			this.resetVectorState();

			for (const item of page.items) {
				if (item.type !== "vector") {
					this.resetVectorState();
				}

				switch (item.type) {
					case "vector":
						this.renderVector(item.item);
						break;
					case "line":
						this.renderLine(item.item, item.item.x ?? 0, item.item.y ?? 0);
						break;
					case "beginClip":
						this.beginClip(item.item as ClipRectangle);
						break;
					case "endClip":
						this.endClip();
						break;
					case "beginVerticalAlignment":
						this.beginVerticalAlignment(item.item as VerticalAlignmentItem);
						break;
					case "endVerticalAlignment":
						this.endVerticalAlignment(item.item as VerticalAlignmentItem);
						break;
					default:
						this.renderFeatureItem(item.type, item.item);
						break;
				}

				renderedItems++;
				this.progressCallback?.(renderedItems / totalItems);
			}

			this.clipping.assertBalanced();

			if (page.watermark) {
				this.renderWatermark(page);
			}
		}
	}

	renderLine(line: LineLike, x: number, y: number): void {
		this.rendering.renderLine(line, this.outlineMap, x, y);
	}

	private resetVectorState(): void {
		this.vectors.reset();
	}

	renderVector(vector: Vector): void {
		this.vectors.render(vector);
	}

	renderFeatureItem(kind: string, node: LayoutPdfNode): void {
		this.rendering.graphics.renderFeatureItem(kind, node, () => this.resetVectorState());
	}

	beginClip(rect: ClipRectangle): void {
		this.clipping.begin(rect);
	}

	endClip(): void {
		this.clipping.end();
	}

	beginVerticalAlignment(item: VerticalAlignmentItem): void {
		beginVerticalAlignment(this.pdfDocument, item);
	}

	endVerticalAlignment(item: VerticalAlignmentItem): void {
		endVerticalAlignment(this.pdfDocument, item);
	}

	renderWatermark(page: RenderablePage): void {
		this.rendering.graphics.renderWatermark(page);
	}
}

export default Renderer;
