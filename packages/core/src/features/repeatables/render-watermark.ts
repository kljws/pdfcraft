import type PDFDocument from "../../rendering/pdf-document";
import type { EmbeddedFont, RenderablePage } from "../../rendering/renderer.types";

export function renderWatermark(document: PDFDocument, page: RenderablePage): void {
	const watermark = page.watermark;
	if (!watermark) return;

	document.fill(document.resolveColor(watermark.color, "black"));
	document.opacity(watermark.opacity);
	document.save();
	document.rotate(watermark.angle, {
		origin: [document.page.width / 2, document.page.height / 2],
	});

	const x = document.page.width / 2 - watermark._size.size.width / 2;
	const y = document.page.height / 2 - watermark._size.size.height / 2;

	document._font = watermark.font as EmbeddedFont;
	document.fontSize(watermark.fontSize);
	document.text(watermark.text, x, y, { lineBreak: false });
	document.restore();
}
