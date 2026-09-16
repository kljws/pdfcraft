import type StyleContextStack from "../../services/styles/style-context-stack";
import type PDFDocument from "../../rendering/pdf-document";
import type { Inline, MeasuredPdfNode } from "../../types/internal";

export interface AcroFormMeasureContext {
	document: PDFDocument;
	styles: StyleContextStack;
}

export function measureAcroForm(
	node: MeasuredPdfNode,
	context: AcroFormMeasureContext,
): MeasuredPdfNode {
	const width = typeof node.width === "number" ? node.width : 10;
	const height = typeof node.height === "number" ? node.height : 15;
	node._minWidth = width;
	node._maxWidth = width;
	node._minHeight = height;
	node._maxHeight = height;
	const font = context.styles.getProperty("font");
	const bold = context.styles.getProperty("bold");
	const italics = context.styles.getProperty("italics");
	node._formFont = context.document.provideFont(
		typeof font === "string" ? font : "Roboto",
		bold === true,
		italics === true,
	);
	return node;
}

export function measureInlineAcroForm(inline: Inline): Inline {
	inline.width = typeof inline.width === "number" ? inline.width : 25;
	inline.height = typeof inline.height === "number" ? inline.height : 15;
	return inline;
}
