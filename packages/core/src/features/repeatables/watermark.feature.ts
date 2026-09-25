import { isString } from "../../utils/variable-type";
import type PDFDocument from "../../rendering/pdf-document";
import type { EmbeddedFont, RenderablePage } from "../../rendering/renderer.types";
import type { MeasuredWatermark, PageSize, PdfPage } from "../../types/internal";
import type { WatermarkDefinition } from "./measure-watermark";

interface WatermarkLayoutContext {
	pages: PdfPage[];
	measureWatermark(watermark: WatermarkDefinition, pageSize: PageSize): MeasuredWatermark;
}

export const watermarkFeature = {
	layout(watermark: unknown, context: WatermarkLayoutContext): void {
		for (const page of context.pages) {
			let pageWatermark = watermark;
			if (page.customProperties.watermark || page.customProperties.watermark === null) {
				pageWatermark = page.customProperties.watermark;
			}
			if (pageWatermark === undefined || pageWatermark === null) continue;
			if (isString(pageWatermark)) pageWatermark = { text: pageWatermark };
			if (
				pageWatermark === null ||
				typeof pageWatermark !== "object" ||
				!("text" in pageWatermark) ||
				!pageWatermark.text
			) {
				continue;
			}

			page.watermark = context.measureWatermark(
				{ ...(pageWatermark as WatermarkDefinition) },
				page.pageSize,
			);
		}
	},
	render(document: PDFDocument, page: RenderablePage): void {
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
	},
};
