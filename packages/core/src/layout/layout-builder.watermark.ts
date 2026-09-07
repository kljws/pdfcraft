import type PDFDocument from "../rendering/pdf-document";
import TextInlines from "../text/text-inlines";
import type { Style } from "../types";
import type { PageSize } from "../types/internal";
import { isNumber, isValue } from "../utils/variable-type";
import StyleContextStack from "./style-context-stack";
import type {
	MeasuredWatermark,
	NormalizedWatermark,
	WatermarkDefinition,
	WatermarkSize,
} from "./layout-builder.types";

export function createWatermark(
	watermark: WatermarkDefinition,
	pageSize: PageSize,
	pdfDocument: PDFDocument,
	defaultStyle: Style,
): MeasuredWatermark {
	watermark.font ||= defaultStyle.font || "Roboto";
	watermark.fontSize ||= "auto";
	watermark.color ||= "black";
	watermark.opacity = isNumber(watermark.opacity) ? watermark.opacity : 0.6;
	watermark.bold ||= false;
	watermark.italics ||= false;
	watermark.angle = isValue(watermark.angle) ? watermark.angle : null;

	if (watermark.angle === null) {
		watermark.angle = (Math.atan2(pageSize.height, pageSize.width) * -180) / Math.PI;
	}
	if (watermark.fontSize === "auto") {
		watermark.fontSize = getWatermarkFontSize(
			pageSize,
			watermark as NormalizedWatermark,
			pdfDocument,
		);
	}

	const normalized = watermark as NormalizedWatermark;
	return {
		text: normalized.text,
		font: pdfDocument.provideFont(normalized.font, normalized.bold, normalized.italics),
		fontSize: normalized.fontSize,
		color: normalized.color,
		opacity: normalized.opacity,
		bold: normalized.bold,
		italics: normalized.italics,
		angle: normalized.angle,
		_size: getWatermarkSize(normalized, pdfDocument),
	};
}

function createTextContext(watermark: NormalizedWatermark, pdfDocument: PDFDocument) {
	return {
		textInlines: new TextInlines(pdfDocument),
		styleStack: new StyleContextStack(null, {
			font: watermark.font,
			bold: watermark.bold,
			italics: watermark.italics,
		}),
	};
}

function getWatermarkSize(watermark: NormalizedWatermark, pdfDocument: PDFDocument): WatermarkSize {
	const { textInlines, styleStack } = createTextContext(watermark, pdfDocument);
	styleStack.push({ fontSize: watermark.fontSize });
	return {
		size: textInlines.sizeOfText(watermark.text, styleStack),
		rotatedSize: textInlines.sizeOfRotatedText(watermark.text, watermark.angle, styleStack),
	};
}

function getWatermarkFontSize(
	pageSize: PageSize,
	watermark: NormalizedWatermark,
	pdfDocument: PDFDocument,
): number {
	const { textInlines, styleStack } = createTextContext(watermark, pdfDocument);
	let minimum = 0;
	let maximum = 1000;
	let candidate = (minimum + maximum) / 2;

	while (Math.abs(minimum - maximum) > 1) {
		styleStack.push({ fontSize: candidate });
		const size = textInlines.sizeOfRotatedText(watermark.text, watermark.angle, styleStack);
		if (size.width > pageSize.width || size.height > pageSize.height) {
			maximum = candidate;
		} else {
			minimum = candidate;
		}
		candidate = (minimum + maximum) / 2;
		styleStack.pop();
	}

	return candidate;
}
