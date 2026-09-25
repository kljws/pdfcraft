import type { FontDescriptors } from "../types";
import type PDFDocument from "./pdf-document";

export function addPageLink(
	document: PDFDocument,
	x: number,
	y: number,
	width: number,
	height: number,
	pageNumber: number,
): void {
	const action = document.ref({ Type: "Action", S: "GoTo", D: [pageNumber, 0, 0] });
	(action.end as () => void)();
	document.annotate(x, y, width, height, {
		Subtype: "Link",
		Dest: [pageNumber - 1, "XYZ", null, null, null],
	} as PDFKit.Mixins.AnnotationOption);
}

export function findFont(
	fonts: FontDescriptors,
	requiredFonts: string[],
	defaultFont: string,
): string {
	for (const requiredFont of requiredFonts) {
		for (const font in fonts) {
			if (font.toLowerCase() === requiredFont.toLowerCase()) {
				return font;
			}
		}
	}

	return defaultFont;
}
