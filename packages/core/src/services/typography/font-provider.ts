import type { Dictionary, FontDescriptors, FontSource, VirtualFileSystem } from "../../types";
import { toArrayBuffer } from "../../utils/bytes";
import { isString } from "../../utils/variable-type";
import type { EmbeddedFont, FontFile, FontStyle } from "./font.types";

export interface FontEmbeddingHost {
	_font: EmbeddedFont;
	font(source: PDFKit.Mixins.PDFFontSource, family?: string): unknown;
	validateLocalFile(path: unknown): void;
}

const resolveFontStyle = (bold: boolean, italics: boolean): FontStyle => {
	if (bold && italics) return "bolditalics";
	if (bold) return "bold";
	if (italics) return "italics";
	return "normal";
};

const normalizeFileSource = (source: FontFile): PDFKit.Mixins.PDFFontSource =>
	source instanceof Uint8Array ? toArrayBuffer(source) : source;

export default class FontProvider {
	readonly fonts: FontDescriptors = {};
	readonly cache: Dictionary<Partial<Record<FontStyle, EmbeddedFont>>> = {};

	constructor(
		private readonly host: FontEmbeddingHost,
		fonts: FontDescriptors = {},
		private readonly virtualfs: VirtualFileSystem | null = null,
	) {
		for (const familyName in fonts) {
			if (fonts.hasOwnProperty(familyName)) {
				const definition = fonts[familyName];
				this.fonts[familyName] = {
					normal: definition.normal,
					bold: definition.bold,
					italics: definition.italics,
					bolditalics: definition.bolditalics,
				};
			}
		}
	}

	getFontType(bold: boolean, italics: boolean): FontStyle {
		return resolveFontStyle(bold, italics);
	}

	getFontFile(familyName: string, bold: boolean, italics: boolean): FontSource | null {
		const type = this.getFontType(bold, italics);
		return this.fonts[familyName]?.[type] || null;
	}

	provideFont(familyName: string, bold: boolean, italics: boolean): EmbeddedFont {
		const type = this.getFontType(bold, italics);
		const source = this.getFontFile(familyName, bold, italics);
		if (source === null) {
			throw new Error(
				`Font '${familyName}' in style '${type}' is not defined in the font section of the document definition.`,
			);
		}

		this.cache[familyName] ||= {};
		if (!this.cache[familyName][type]) {
			const definition: [FontFile, string?] = Array.isArray(source)
				? [source[0] as FontFile, source[1]]
				: [source as FontFile];

			if (this.virtualfs && isString(definition[0]) && this.virtualfs.existsSync(definition[0])) {
				definition[0] = this.virtualfs.readFileSync(definition[0]);
			} else {
				this.host.validateLocalFile(definition[0]);
			}

			if (definition[1] === undefined) {
				this.host.font(normalizeFileSource(definition[0]));
			} else {
				this.host.font(normalizeFileSource(definition[0]), definition[1]);
			}
			this.cache[familyName][type] = this.host._font;
		}

		return this.cache[familyName][type]!;
	}
}
