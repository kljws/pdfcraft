import type PDFDocument from "../../rendering/pdf-document";
import { addPageLink } from "../../rendering/renderer.helpers";
import type { EmbeddedFont } from "../../rendering/renderer.types";
import type { Inline, LayoutPdfNode, LineLike, MeasuredPdfNode } from "../../types/internal";
import { isNumber } from "../../utils/variable-type";
import TextDecorator from "./text-decorator";

export interface TextRenderContext {
	document: PDFDocument;
	outlineMap: Record<string, PDFKit.PDFOutline>;
	x: number;
	y: number;
	/** Renders an inline form field owned by another feature. */
	renderAcroForm(inline: Inline, x: number, y: number): void;
}

interface TextOptions extends PDFKit.Mixins.TextOptions {
	textWidth: number;
	wordCount: number;
}

const offsetText = (y: number, inline: Inline): number => {
	if (inline.sup) return y - inline.fontSize * 0.75;
	if (inline.sub) return y + inline.fontSize * 0.35;
	return y;
};

/**
 * Page numbers are measured with their final value before layout converges, so each fragment is
 * rendered as laid out. A reference whose target was never placed is still an error.
 */
const assertPageReferenceResolved = (pageNodeRef: MeasuredPdfNode | LayoutPdfNode): void => {
	const positions = "positions" in pageNodeRef ? pageNodeRef.positions : undefined;
	if (!Array.isArray(positions)) throw new Error("Page reference id not found");
	if (positions[0]?.pageNumber === undefined) {
		throw new Error("Page reference position not found");
	}
};

export function renderTextLine(line: LineLike, context: TextRenderContext): void {
	const document = context.document;
	let { x, y } = context;

	if (line._outline) {
		let parentOutline = document.outline;
		if (line._outline.parentId && context.outlineMap[line._outline.parentId]) {
			parentOutline = context.outlineMap[line._outline.parentId];
		}

		const outline = parentOutline.addItem(line._outline.text, {
			expanded: line._outline.expanded,
		});
		if (line._outline.id) context.outlineMap[line._outline.id] = outline;
	}

	if (line._pageNodeRef) assertPageReferenceResolved(line._pageNodeRef);

	x ||= 0;
	y ||= 0;
	const lineHeight = line.getHeight();
	const descent = lineHeight - line.getAscenderHeight();
	const textDecorator = new TextDecorator(document);

	textDecorator.drawBackground(line, x, y);

	for (let index = 0; index < line.inlines.length; index++) {
		const inline = line.inlines[index];
		const shiftToBaseline = lineHeight - (inline.font.ascender / 1000) * inline.fontSize - descent;

		if (inline.acroform) {
			context.renderAcroForm(inline, x + inline.x, y + Math.max(0, lineHeight - inline.height));
			continue;
		}

		if (inline._pageNodeRef) assertPageReferenceResolved(inline._pageNodeRef);

		const options: TextOptions = {
			lineBreak: false,
			textWidth: inline.width,
			characterSpacing: inline.characterSpacing,
			wordCount: 1,
			link: inline.link,
		};
		if (inline.linkToDestination) options.goTo = inline.linkToDestination;
		if (line.id && index === 0) options.destination = line.id;
		if (inline.fontFeatures) {
			options.features = inline.fontFeatures as PDFKit.Mixins.OpenTypeFeatures[];
		}

		document.opacity(isNumber(inline.opacity) ? inline.opacity : 1);
		document.fill(document.resolveColor(inline.color, "black"));
		document._font = inline.font as EmbeddedFont;
		document.fontSize(inline.fontSize);

		const shiftedY = inline.image !== undefined ? y : offsetText(y + shiftToBaseline, inline);
		if (inline.image !== undefined) {
			document.image(inline.image as PDFKit.Mixins.ImageSrc, x + inline.x, shiftedY, {
				width: inline._imageWidth ?? inline.width,
				height: inline._imageHeight ?? inline.height,
			});
		} else {
			document.text(inline.text, x + inline.x, shiftedY, options);
		}

		if (inline.linkToPage) {
			addPageLink(document, x + inline.x, shiftedY, inline.width, inline.height, inline.linkToPage);
		}
	}

	textDecorator.drawDecorations(line, x, y);
}
