import { acroFormFeature, type AcroFormRenderContext } from "../features/acroform/acroform.feature";
import type { AttachmentRenderContext } from "../features/attachment/render-attachment";
import type { ExtensionRenderContext } from "../features/extension/render-extension";
import { imageFeature } from "../features/image/image.feature";
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

export type BuiltInGraphicsRendering = {
	renderFeatureItem(kind: string, node: LayoutPdfNode, resetVectorState: () => void): void;
	/** Draws inline content of another feature in a text line, dispatched by its kind. */
	renderInlineContent(inline: Inline, x: number, y: number): void;
	renderWatermark(page: RenderablePage): void;
};

export type BuiltInRendering = {
	graphics: BuiltInGraphicsRendering;
	renderLine(
		line: LineLike,
		outlineMap: Record<string, PDFKit.PDFOutline>,
		x: number,
		y: number,
	): void;
};

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
		renderInlineContent: (inline, x, y) => {
			switch (inline.content?.kind) {
				case imageFeature.inline.kind:
					imageFeature.inline.render(inline, { document, x, y });
					break;
				case acroFormFeature.inline.kind:
					acroFormFeature.inline.render(inline, { renderer: acroFormRenderer, x, y });
					break;
				default:
					throw new Error(
						`No inline renderer registered for '${inline.content?.kind ?? "unknown"}' content`,
					);
			}
		},
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
				renderInlineContent: graphics.renderInlineContent,
			}),
	};
}
