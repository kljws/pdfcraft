import type { FontDescriptors } from "../types";
import type { Inline } from "../types/internal";

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

export function offsetText(y: number, inline: Inline): number {
	if (inline.sup) {
		return y - inline.fontSize * 0.75;
	}
	if (inline.sub) {
		return y + inline.fontSize * 0.35;
	}
	return y;
}
