import type PDFDocument from "./pdf-document";
import type { VerticalAlignmentItem } from "./renderer.types";

export function beginVerticalAlignment(document: PDFDocument, item: VerticalAlignmentItem): void {
	if (item.isCellContentMultiPage) return;

	switch (item.verticalAlignment) {
		case "middle":
			document.save();
			document.translate(0, -(item.getNodeHeight() - item.getViewHeight()) / 2);
			break;
		case "bottom":
			document.save();
			document.translate(0, -(item.getNodeHeight() - item.getViewHeight()));
			break;
	}
}

export function endVerticalAlignment(document: PDFDocument, item: VerticalAlignmentItem): void {
	if (item.isCellContentMultiPage) return;

	switch (item.verticalAlignment) {
		case "middle":
		case "bottom":
			document.restore();
			break;
	}
}
