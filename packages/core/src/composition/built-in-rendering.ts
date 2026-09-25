import { acroFormFeature } from "../features/acroform/acroform.feature";
import type { LayoutAcroFormNode } from "../features/acroform/acroform.types";
import type { LayoutAttachmentNode } from "../features/attachment/attachment.types";
import { extensionFeature } from "../features/extension/extension.feature";
import type { LayoutImageNode } from "../features/image/image.types";
import type { LayoutExtensionNode } from "../features/extension/extension.types";
import { watermarkFeature } from "../features/repeatables/watermark.feature";
import { textFeature } from "../features/text/text.feature";
import type PDFDocument from "../rendering/pdf-document";
import type { RenderablePage } from "../rendering/renderer.types";
import type { PdfCraftExtensions } from "../types";
import type { Inline, LineLike } from "../types/internal";
import { renderMigratedNodeFeature } from "./built-in-feature-registry";

export interface BuiltInGraphicsRendering {
	renderImage(node: LayoutImageNode, resetVectorState: () => void): void;
	renderExtension(node: LayoutExtensionNode): void;
	renderAttachment(node: LayoutAttachmentNode): void;
	renderWatermark(page: RenderablePage): void;
}

export interface BuiltInRendering {
	graphics: BuiltInGraphicsRendering;
	renderAcroForm(node: LayoutAcroFormNode | Inline, x: number, y: number): void;
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
			void renderMigratedNodeFeature(node, document, resetVectorState),
		renderExtension: (node) => extensionFeature.render(node, { document, extensions }),
		renderAttachment: (node) => void renderMigratedNodeFeature(node, document, () => undefined),
		renderWatermark: (page) => watermarkFeature.render(document, page),
	};
}

export function createBuiltInRendering(
	document: PDFDocument,
	extensions: PdfCraftExtensions = [],
): BuiltInRendering {
	const acroFormRenderer = acroFormFeature.createRenderer(document);
	const renderAcroForm = (node: LayoutAcroFormNode | Inline, x: number, y: number): void => {
		acroFormFeature.render(node, {
			renderer: acroFormRenderer,
			x,
			y,
		});
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
