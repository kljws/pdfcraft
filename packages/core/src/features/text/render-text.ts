import type PDFDocument from "../../rendering/pdf-document";
import type { EmbeddedFont } from "../../rendering/renderer.types";
import type { Inline, LayoutPdfNode, LineLike, MeasuredPdfNode } from "../../types/internal";
import { isNumber } from "../../utils/variable-type";
import TextDecorator from "./text-decorator";
import TextInlines from "./text-inlines";

export interface TextRenderContext {
	document: PDFDocument;
	outlineMap: Record<string, PDFKit.PDFOutline>;
	x: number;
	y: number;
	renderAcroForm(node: LayoutPdfNode | Inline, x: number, y: number): void;
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

const preparePageNodeRefLine = (
	pageNodeRef: MeasuredPdfNode | LayoutPdfNode,
	inline: Inline,
): void => {
	const positions = "positions" in pageNodeRef ? pageNodeRef.positions : undefined;
	if (positions === undefined) throw new Error("Page reference id not found");

	const pageNumber = positions[0]?.pageNumber;
	if (pageNumber === undefined) throw new Error("Page reference position not found");
	inline.text = pageNumber.toString();
	const newWidth = new TextInlines(null).widthOfText(inline.text, inline);
	const diffWidth = inline.width - newWidth;
	inline.width = newWidth;

	if (inline.alignment === "right") inline.x += diffWidth;
	else if (inline.alignment === "center") inline.x += diffWidth / 2;
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

	if (line._pageNodeRef) preparePageNodeRefLine(line._pageNodeRef, line.inlines[0]);

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

		if (inline._pageNodeRef) preparePageNodeRefLine(inline._pageNodeRef, inline);

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
			const action = document.ref({
				Type: "Action",
				S: "GoTo",
				D: [inline.linkToPage, 0, 0],
			});
			(action.end as () => void)();
			document.annotate(x + inline.x, shiftedY, inline.width, inline.height, {
				Subtype: "Link",
				Dest: [inline.linkToPage - 1, "XYZ", null, null, null],
			} as PDFKit.Mixins.AnnotationOption);
		}
	}

	textDecorator.drawDecorations(line, x, y);
}
