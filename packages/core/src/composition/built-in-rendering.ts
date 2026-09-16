import { acroFormFeature } from "../features/acroform/acroform.feature";
import { attachmentFeature } from "../features/attachment/attachment.feature";
import type { LayoutAttachmentNode } from "../features/attachment/attachment.types";
import { extensionFeature } from "../features/extension/extension.feature";
import { imageFeature } from "../features/image/image.feature";
import type { LayoutImageNode } from "../features/image/image.types";
import { watermarkFeature } from "../features/repeatables/watermark.feature";
import { textFeature } from "../features/text/text.feature";
import type PDFDocument from "../rendering/pdf-document";
import type { RenderablePage } from "../rendering/renderer.types";
import type { PdfCraftExtensions } from "../types";
import type { Inline, LayoutPdfNode, LineLike } from "../types/internal";

export interface BuiltInGraphicsRendering {
	renderImage(node: LayoutPdfNode, resetVectorState: () => void): void;
	renderExtension(node: LayoutPdfNode): void;
	renderAttachment(node: LayoutPdfNode): void;
	renderWatermark(page: RenderablePage): void;
}

export interface BuiltInRendering {
	graphics: BuiltInGraphicsRendering;
	renderAcroForm(node: LayoutPdfNode | Inline, x: number, y: number): void;
	renderLine(
		line: LineLike,
		outlineMap: Record<string, PDFKit.PDFOutline>,
		x: number,
		y: number,
	): void;
}

export function createBuiltInGraphicsRendering(
	document: PDFDocument,
	extensions: PdfCraftExtensions = [],
): BuiltInGraphicsRendering {
	return {
		renderImage: (node, resetVectorState) =>
			imageFeature.render(node as LayoutImageNode, { document, resetVectorState }),
		renderExtension: (node) => extensionFeature.render(node, { document, extensions }),
		renderAttachment: (node) =>
			attachmentFeature.render(node as LayoutAttachmentNode, { document }),
		renderWatermark: (page) => watermarkFeature.render(document, page),
	};
}

export function createBuiltInRendering(
	document: PDFDocument,
	extensions: PdfCraftExtensions = [],
): BuiltInRendering {
	const acroFormRenderer = acroFormFeature.createRenderer(document);
	const renderAcroForm = (node: LayoutPdfNode | Inline, x: number, y: number): void => {
		acroFormFeature.render(node, { renderer: acroFormRenderer, x, y });
	};

	return {
		graphics: createBuiltInGraphicsRendering(document, extensions),
		renderAcroForm,
		renderLine: (line, outlineMap, x, y) =>
			textFeature.render(line, {
				document,
				outlineMap,
				x,
				y,
				renderAcroForm,
			}),
	};
}
