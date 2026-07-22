import PDFKit from "pdfkit";
import { isString } from "../utils/variable-type";
import { decodeBase64, toArrayBuffer } from "../utils/bytes";
import type {
	AccessPolicy,
	Dictionary,
	FontDescriptors,
	FontSource,
	VirtualFileSystem,
} from "../types";
import type {
	AttachmentDefinition,
	EmbeddedFont,
	EmbeddedImage,
	FontFile,
	FontStyle,
	InputColor,
	PatternColor,
	PatternDefinition,
	PdfDocumentOptions,
	ResolvedColor,
	FileAnnotationOptions,
} from "./renderer.types";
import type { PdfPage } from "../types/internal";

const typeName = (bold: boolean, italics: boolean): FontStyle => {
	let type: FontStyle = "normal";
	if (bold && italics) {
		type = "bolditalics";
	} else if (bold) {
		type = "bold";
	} else if (italics) {
		type = "italics";
	}
	return type;
};

class PDFDocument extends PDFKit {
	declare fonts: FontDescriptors;
	declare fontCache: Dictionary<Partial<Record<FontStyle, EmbeddedFont>>>;
	declare patterns: Dictionary<PDFKit.PDFTilingPattern>;
	declare images: Dictionary<string>;
	declare attachments: Dictionary<AttachmentDefinition>;
	declare virtualfs: VirtualFileSystem | null;
	declare localAccessPolicy: AccessPolicy | undefined;
	declare _font: EmbeddedFont;
	declare _imageRegistry: Dictionary<EmbeddedImage>;
	declare _root: { data: { OpenAction?: PDFKit.PDFKitReference } };
	declare _normalizeColor: ((color: string) => unknown[] | null) | undefined;
	declare openImage: (source: PDFKit.Mixins.ImageSrc) => EmbeddedImage;
	declare _pdfCraftPages: PdfPage[];
	declare fileAnnotation: (
		x: number,
		y: number,
		width: number,
		height: number,
		file: AttachmentDefinition | FontFile,
		options?: FileAnnotationOptions,
	) => this;

	constructor(
		fonts: FontDescriptors = {},
		images: Dictionary<string> = {},
		patterns: Dictionary<PatternDefinition> = {},
		attachments: Dictionary<AttachmentDefinition> = {},
		options: PdfDocumentOptions = {},
		virtualfs: VirtualFileSystem | null = null,
		localAccessPolicy?: AccessPolicy,
	) {
		super({ ...options, font: options.font ?? undefined });

		this.fonts = {};
		this.fontCache = {};
		for (let font in fonts) {
			if (fonts.hasOwnProperty(font)) {
				let fontDef = fonts[font];

				this.fonts[font] = {
					normal: fontDef.normal,
					bold: fontDef.bold,
					italics: fontDef.italics,
					bolditalics: fontDef.bolditalics,
				};
			}
		}

		this.patterns = {};
		for (let pattern in patterns) {
			if (patterns.hasOwnProperty(pattern)) {
				const patternDef = patterns[pattern] as PatternDefinition;
				const createPattern = this.pattern.bind(this) as (
					bbox: PDFKit.Mixins.BoundingBox,
					xStep: number,
					yStep: number,
					stream: string,
					colored?: boolean,
				) => PDFKit.PDFTilingPattern;
				this.patterns[pattern] = createPattern(
					patternDef.boundingBox,
					patternDef.xStep,
					patternDef.yStep,
					patternDef.pattern,
					patternDef.colored,
				);
			}
		}

		this.images = images;
		this.attachments = attachments;
		this.virtualfs = virtualfs;
		this.localAccessPolicy = localAccessPolicy;
	}

	getFontType(bold: boolean, italics: boolean): FontStyle {
		return typeName(bold, italics);
	}

	getFontFile(familyName: string, bold: boolean, italics: boolean): FontSource | null {
		let type = this.getFontType(bold, italics);
		if (!this.fonts[familyName] || !this.fonts[familyName][type]) {
			return null;
		}

		return this.fonts[familyName][type];
	}

	provideFont(familyName: string, bold: boolean, italics: boolean): EmbeddedFont {
		let type = this.getFontType(bold, italics);
		if (this.getFontFile(familyName, bold, italics) === null) {
			throw new Error(
				`Font '${familyName}' in style '${type}' is not defined in the font section of the document definition.`,
			);
		}

		this.fontCache[familyName] = this.fontCache[familyName] || {};

		if (!this.fontCache[familyName][type]) {
			const source = this.fonts[familyName][type]!;
			const def: [FontFile, string?] = Array.isArray(source)
				? [source[0] as FontFile, source[1]]
				: [source as FontFile];

			if (this.virtualfs && isString(def[0]) && this.virtualfs.existsSync(def[0])) {
				const file = this.virtualfs.readFileSync(def[0]);
				def[0] = file;
			} else {
				this.validateLocalFile(def[0]);
			}

			if (def[1] !== undefined) {
				this.font(normalizeFileSource(def[0]), def[1]);
			} else {
				this.font(normalizeFileSource(def[0]));
			}
			this.fontCache[familyName][type] = this._font;
		}

		return this.fontCache[familyName][type]!;
	}

	provideImage(src: string): EmbeddedImage {
		const realImageSrc = (src: string): PDFKit.Mixins.ImageSrc => {
			const image = this.images[src];

			if (!image) {
				return src;
			}
			if (!isString(image)) {
				throw new Error(`Invalid image resource '${src}'`);
			}

			if (this.virtualfs && this.virtualfs.existsSync(image)) {
				const file = this.virtualfs.readFileSync(image);
				return typeof file === "string" ? file : toArrayBuffer(file);
			}

			let index = image.indexOf("base64,");
			if (index < 0) {
				return image;
			}

			return toArrayBuffer(decodeBase64(image.substring(index + 7)));
		};

		if (this._imageRegistry[src]) {
			return this._imageRegistry[src];
		}

		let image: EmbeddedImage;

		let imageSrc = realImageSrc(src);

		this.validateLocalFile(imageSrc);

		try {
			image = this.openImage(imageSrc);
			if (!image) {
				throw new Error("No image");
			}
		} catch (error: unknown) {
			throw new Error(
				`Invalid image: ${String(error)}\nImages dictionary should contain dataURL entries (or local file paths in node.js)`,
				{ cause: error },
			);
		}

		image.embed(this);
		this._imageRegistry[src] = image;

		return image;
	}

	/**
	 * @param color PDFCraft format: [<pattern name>, <color>]
	 * @returns pdfkit format: [<pattern object>, <color>]
	 */
	providePattern(color: InputColor): PatternColor | null {
		if (Array.isArray(color) && color.length === 2) {
			const pattern = this.patterns[color[0] as string];
			return pattern ? [pattern, color[1] as PDFKit.Mixins.TilingPatternColorValue] : null;
		}

		return null;
	}

	provideAttachment(src: string | AttachmentDefinition): AttachmentDefinition {
		const checkRequired = (obj: unknown): AttachmentDefinition => {
			if (!obj || typeof obj !== "object") {
				throw new Error("No attachment");
			}
			if (!("src" in obj) || !obj.src) {
				throw new Error('The "src" key is required for attachments');
			}

			return obj as AttachmentDefinition;
		};

		if (typeof src === "object") {
			return checkRequired(src);
		}

		let attachment = checkRequired(this.attachments[src]);

		if (this.virtualfs && isString(attachment.src) && this.virtualfs.existsSync(attachment.src)) {
			const file = this.virtualfs.readFileSync(attachment.src);
			return { ...attachment, src: file };
		}

		this.validateLocalFile(attachment.src);

		return attachment;
	}

	resolveColor(color: InputColor, defaultColor: string): ResolvedColor;
	resolveColor(color: InputColor, defaultColor?: string): ResolvedColor | undefined;
	resolveColor(color: InputColor, defaultColor?: string): ResolvedColor | undefined {
		if (Array.isArray(color)) {
			return this.providePattern(color) ?? defaultColor;
		}
		const resolvedColor = color || defaultColor;
		if (!resolvedColor) {
			return undefined;
		}

		if (typeof this._normalizeColor === "function") {
			if (isString(resolvedColor) && this._normalizeColor(resolvedColor) === null) {
				// color is not valid
				return defaultColor;
			}
		}

		return resolvedColor as ResolvedColor;
	}

	setOpenActionAsPrint(): void {
		let printActionRef = this.ref({
			Type: "Action",
			S: "Named",
			N: "Print",
		});
		this._root.data.OpenAction = printActionRef;
		(printActionRef.end as () => void)();
	}

	override file(
		src: Uint8Array | ArrayBuffer | string,
		options: PDFKit.Mixins.PDFAttachmentOptions = {},
	): this {
		this.validateLocalFile(src);
		const inMemorySource =
			src instanceof Uint8Array || src instanceof ArrayBuffer || /^data:.*;base64,/.test(src);
		if (inMemorySource && !(options.creationDate instanceof Date)) {
			options = { ...options, creationDate: new Date(0) };
		}

		return super.file(src instanceof Uint8Array ? toArrayBuffer(src) : src, options);
	}

	validateLocalFile(path: unknown): void {
		if (typeof this.localAccessPolicy === "undefined") {
			return;
		}

		if (!isString(path)) {
			return;
		}

		if (/^data:/.test(path)) {
			return;
		}

		if (this.localAccessPolicy(path) !== true) {
			throw new Error(`Access to local file denied by resource access policy: ${path}`);
		}
	}
}

function normalizeFileSource(source: FontFile): PDFKit.Mixins.PDFFontSource {
	return source instanceof Uint8Array ? toArrayBuffer(source) : source;
}

export default PDFDocument;
