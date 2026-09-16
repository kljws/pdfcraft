import type { FontDescriptors } from "../types";

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
