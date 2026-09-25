import { acroFormFeature, type AcroFormRenderContext } from "../features/acroform/acroform.feature";
import type { LayoutAcroFormNode } from "../features/acroform/acroform.types";
import type { AttachmentRenderContext } from "../features/attachment/render-attachment";
import type { ExtensionRenderContext } from "../features/extension/render-extension";
import type { ImageRenderContext } from "../features/image/render-image";
import { watermarkFeature } from "../features/repeatables/watermark.feature";
import { textFeature } from "../features/text/text.feature";
import type PDFDocument from "../rendering/pdf-document";
import type { RenderablePage } from "../rendering/renderer.types";
import type { PdfCraftExtensions } from "../types";
import type { Inline, LayoutPdfNode, LineLike } from "../types/internal";
import { renderFeatureItem } from "./built-in-feature-registry";

/** Every capability a feature page-item renderer may request. */
type BuiltInRenderContext = AcroFormRenderContext &
	AttachmentRenderContext &
	ExtensionRenderContext &
	ImageRenderContext;

export interface BuiltInGraphicsRendering {
	renderFeatureItem(kind: string, node: LayoutPdfNode, resetVectorState: () => void): void;
	renderAcroForm(node: LayoutAcroFormNode | Inline, x: number, y: number): void;
	renderWatermark(page: RenderablePage): void;
}

export interface BuiltInRendering {
	graphics: BuiltInGraphicsRendering;
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
	const acroFormRenderer = acroFormFeature.createRenderer(document);

	return {
		renderFeatureItem: (kind, node, resetVectorState) =>
			renderFeatureItem<BuiltInRenderContext>(kind, node, {
				document,
				extensions,
				resetVectorState,
				renderer: acroFormRenderer,
				x: node.x ?? 0,
				y: node.y ?? 0,
			}),
		renderAcroForm: (node, x, y) =>
			acroFormFeature.render(node, { renderer: acroFormRenderer, x, y }),
		renderWatermark: (page) => watermarkFeature.render(document, page),
	};
}

export function createBuiltInRendering(
	document: PDFDocument,
	extensions: PdfCraftExtensions = [],
): BuiltInRendering {
	const graphics = createBuiltInGraphicsRendering(document, extensions);

	return {
		graphics,
		renderLine: (line, outlineMap, x, y) =>
			textFeature.render(line, {
				document,
				outlineMap,
				x,
				y,
				renderAcroForm: graphics.renderAcroForm,
			}),
	};
}
