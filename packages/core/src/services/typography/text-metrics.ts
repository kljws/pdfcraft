import type { Inline, PdfFont } from "../../types/internal";
import type StyleContextStack from "../styles/style-context-stack";

export interface TextSize {
	width: number;
	height: number;
	fontSize: number;
	lineHeight: number;
	ascender: number;
	descender: number;
}

export interface TextFontProvider {
	provideFont(familyName: string, bold: boolean, italics: boolean): PdfFont;
}

export interface ResolvedTextStyle {
	fontName: string;
	fontSize: number;
	fontFeatures: unknown;
	bold: boolean;
	italics: boolean;
	lineHeight: number;
	characterSpacing: number;
}

export default class TextMetrics {
	constructor(private readonly fontProvider: TextFontProvider | null) {}

	widthOfText(
		text: string,
		inline: Pick<Inline, "font" | "fontSize"> & {
			fontFeatures?: unknown;
			characterSpacing?: number;
		},
	): number {
		return (
			inline.font.widthOfString(text, inline.fontSize, inline.fontFeatures) +
			(inline.characterSpacing || 0) * (text.length - 1)
		);
	}

	sizeOfText(text: string, styleContextStack: StyleContextStack): TextSize {
		const textStyle = this.resolveTextStyle({}, styleContextStack);
		const font = this.requireFontProvider().provideFont(
			textStyle.fontName,
			textStyle.bold,
			textStyle.italics,
		);

		return {
			width: this.widthOfText(text, {
				font,
				fontSize: textStyle.fontSize,
				characterSpacing: textStyle.characterSpacing,
				fontFeatures: textStyle.fontFeatures,
			}),
			height: font.lineHeight(textStyle.fontSize) * textStyle.lineHeight,
			fontSize: textStyle.fontSize,
			lineHeight: textStyle.lineHeight,
			ascender: (font.ascender / 1000) * textStyle.fontSize,
			descender: (font.descender / 1000) * textStyle.fontSize,
		};
	}

	private resolveTextStyle(item: object, styleContextStack: StyleContextStack): ResolvedTextStyle {
		return styleContextStack.auto(item, () => this.resolveTextStyleFromStack(styleContextStack));
	}

	resolveTextStyleFromStack(styleContextStack: StyleContextStack): ResolvedTextStyle {
		return {
			fontName: styleContextStack.getPropertyOrDefault("font", "Roboto"),
			fontSize: styleContextStack.getPropertyOrDefault("fontSize", 12),
			fontFeatures: styleContextStack.getPropertyOrDefault("fontFeatures", null),
			bold: styleContextStack.getPropertyOrDefault("bold", false),
			italics: styleContextStack.getPropertyOrDefault("italics", false),
			lineHeight: styleContextStack.getPropertyOrDefault("lineHeight", 1),
			characterSpacing: styleContextStack.getPropertyOrDefault("characterSpacing", 0),
		};
	}

	sizeOfRotatedText(
		text: string,
		angle: number,
		styleContextStack: StyleContextStack,
	): { width: number; height: number } {
		const angleRad = (angle * Math.PI) / -180;
		const size = this.sizeOfText(text, styleContextStack);
		return {
			width: Math.abs(size.height * Math.sin(angleRad)) + Math.abs(size.width * Math.cos(angleRad)),
			height:
				Math.abs(size.width * Math.sin(angleRad)) + Math.abs(size.height * Math.cos(angleRad)),
		};
	}

	private requireFontProvider(): TextFontProvider {
		if (!this.fontProvider) {
			throw new Error("A PDF document is required for text measurement");
		}
		return this.fontProvider;
	}
}
