import {
	createBuiltInGraphicsRendering,
	type BuiltInGraphicsRendering,
} from "../composition/built-in-rendering";
import type { PdfCraftExtensions } from "../types";
import type { LayoutPdfNode, Vector } from "../types/internal";
import type PDFDocument from "./pdf-document";
import type { ClipRectangle, RenderablePage, VerticalAlignmentItem } from "./renderer.types";
import VectorRenderer from "./vector-renderer";
import ClippingRenderer from "./clipping-renderer";
import { beginVerticalAlignment, endVerticalAlignment } from "./render-vertical-alignment";

class RendererGraphics {
	protected readonly pdfDocument: PDFDocument;
	private readonly rendering: BuiltInGraphicsRendering;
	private readonly vectors: VectorRenderer;
	private readonly clipping: ClippingRenderer;

	constructor(
		pdfDocument: PDFDocument,
		extensions: PdfCraftExtensions = [],
		rendering: BuiltInGraphicsRendering = createBuiltInGraphicsRendering(pdfDocument, extensions),
	) {
		this.pdfDocument = pdfDocument;
		this.rendering = rendering;
		this.vectors = new VectorRenderer(pdfDocument);
		this.clipping = new ClippingRenderer(pdfDocument, () => this.resetVectorState());
	}

	beginPage(): void {
		this.resetVectorState();
	}

	prepareNonVectorItem(): void {
		this.resetVectorState();
	}

	endPage(): void {
		this.clipping.assertBalanced();
	}

	private resetVectorState(): void {
		this.vectors.reset();
	}

	renderVector(vector: Vector): void {
		this.vectors.render(vector);
	}

	renderFeatureItem(kind: string, node: LayoutPdfNode): void {
		this.rendering.renderFeatureItem(kind, node, () => this.resetVectorState());
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
		this.rendering.renderWatermark(page);
	}
}

export default RendererGraphics;
