import { isString } from "../../utils/variable-type";
import type PDFDocument from "../../rendering/pdf-document";
import type { RenderablePage } from "../../rendering/renderer.types";
import { renderWatermark } from "./render-watermark";
import type { WatermarkDefinition, WatermarkLayoutContext } from "./watermark.types";

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
		renderWatermark(document, page);
	},
};
