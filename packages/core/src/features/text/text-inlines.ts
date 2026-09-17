import TextBreaker from "./text-breaker";
import StyleContextStack from "../../services/styles/style-context-stack";
import TextMetrics, {
	type TextFontProvider,
	type TextSize,
} from "../../services/typography/text-metrics";
import { isObject } from "../../utils/variable-type";
import type { Inline, MeasuredPdfNode } from "../../types/internal";
import type { BrokenInline, InlineMeasurement, TextFragment } from "./text.types";

const LEADING = /^(\s)+/g;
const TRAILING = /(\s)+$/g;

const flattenTextArray = (input: TextFragment | TextFragment[]): TextFragment[] => {
	const combineStyles = (parent: unknown, child: unknown): unknown => {
		if (parent === undefined) return child;
		if (child === undefined) return parent;
		return [parent, child].flat();
	};

	function flatten(
		value: TextFragment | TextFragment[],
		inheritedStyle: Record<string, unknown> = {},
	): TextFragment[] {
		if (Array.isArray(value)) {
			return value.flatMap((item) => flatten(item, inheritedStyle));
		}
		if (isObject(value) && Array.isArray(value.text)) {
			const ownStyle = StyleContextStack.copyStyle(value);
			const nestedStyle = { ...inheritedStyle, ...ownStyle };
			nestedStyle.style = combineStyles(inheritedStyle.style, ownStyle.style);
			return flatten(value.text as TextFragment[], nestedStyle);
		}
		if (Object.keys(inheritedStyle).length === 0) return [value];
		if (isObject(value)) {
			const leaf = value as Record<string, unknown>;
			return [
				{
					...inheritedStyle,
					...leaf,
					style: combineStyles(inheritedStyle.style, leaf.style),
				} as TextFragment,
			];
		}
		return [{ ...inheritedStyle, text: value } as TextFragment];
	}

	return flatten(input);
};

/**
 * Text measurement utility
 */
class TextInlines {
	declare pdfDocument: TextFontProvider | null;
	private readonly textMetrics: TextMetrics;
	private readonly measureInlineImage?: (node: MeasuredPdfNode) => MeasuredPdfNode;
	private readonly measureInlineAcroForm?: (inline: Inline) => Inline;

	/**
	 * @param pdfDocument object is instance of PDFDocument
	 */
	constructor(
		pdfDocument: TextFontProvider | null,
		measureInlineImage?: (node: MeasuredPdfNode) => MeasuredPdfNode,
		measureInlineAcroForm?: (inline: Inline) => Inline,
	) {
		this.pdfDocument = pdfDocument;
		this.textMetrics = new TextMetrics(pdfDocument);
		this.measureInlineImage = measureInlineImage;
		this.measureInlineAcroForm = measureInlineAcroForm;
	}

	/**
	 * Converts an array of strings (or inline-definition-objects) into a collection
	 * of inlines and calculated minWidth/maxWidth and their min/max widths
	 *
	 * @param textArray an array of inline-definition-objects (or strings)
	 * @param styleContextStack current style stack
	 * @returns collection of inlines, minWidth, maxWidth
	 */
	buildInlines(
		textArray: TextFragment | TextFragment[],
		styleContextStack = new StyleContextStack(null),
	): InlineMeasurement {
		const getTrimmedWidth = (item: {
			width: number;
			leadingCut: number;
			trailingCut: number;
		}): number => {
			return Math.max(0, item.width - item.leadingCut - item.trailingCut);
		};

		let minWidth = 0;
		let maxWidth = 0;
		let currentLineWidth: {
			width: number;
			leadingCut: number;
			trailingCut: number;
		} | null = null;

		const flattenedTextArray = flattenTextArray(textArray);

		const textBreaker = new TextBreaker();
		const brokenText = textBreaker.getBreaks(flattenedTextArray, styleContextStack);

		const measuredText = this.measure(brokenText, styleContextStack);

		measuredText.forEach((inline) => {
			minWidth = Math.max(minWidth, getTrimmedWidth(inline));

			if (!currentLineWidth) {
				currentLineWidth = { width: 0, leadingCut: inline.leadingCut, trailingCut: 0 };
			}

			currentLineWidth.width += inline.width;
			currentLineWidth.trailingCut = inline.trailingCut;

			maxWidth = Math.max(maxWidth, getTrimmedWidth(currentLineWidth));

			if (inline.lineEnd) {
				currentLineWidth = null;
			}
		});

		if (StyleContextStack.getStyleProperty({}, styleContextStack, "noWrap", false)) {
			minWidth = maxWidth;
		}

		return {
			items: measuredText,
			minWidth: minWidth,
			maxWidth: maxWidth,
		};
	}

	measure(array: BrokenInline[], styleContextStack: StyleContextStack): Inline[] {
		if (array.length) {
			const leadingIndent = StyleContextStack.getStyleProperty(
				array[0],
				styleContextStack,
				"leadingIndent",
				0,
			);
			if (leadingIndent) {
				array[0].leadingCut = -leadingIndent;
				array[0].leadingIndent = leadingIndent;
			}
		}

		const pdfDocument = this.requirePdfDocument();
		const measured: Inline[] = [];
		array.forEach((item) => {
			styleContextStack.auto(item, () => {
				const textStyle = this.textMetrics.resolveTextStyleFromStack(styleContextStack);
				const isMediaInline = item.image !== undefined || item.acroform !== undefined;
				const requestedImageWidth =
					isMediaInline && typeof item.width === "number" ? item.width : 0;
				const requestedImageHeight =
					isMediaInline && typeof item.height === "number" ? item.height : 0;
				const inline: Inline = Object.assign(item, {
					font: pdfDocument.provideFont(textStyle.fontName, textStyle.bold, textStyle.italics),
					fontSize: textStyle.fontSize,
					width: requestedImageWidth,
					height: requestedImageHeight,
					x: 0,
					leadingCut: typeof item.leadingCut === "number" ? item.leadingCut : 0,
					trailingCut: 0,
				});

				inline.alignment = styleContextStack.getPropertyOrDefault("alignment", "left");
				inline.fontFeatures = textStyle.fontFeatures;
				inline.characterSpacing = textStyle.characterSpacing;
				inline.color = styleContextStack.getPropertyOrDefault("color", "black");
				inline.decoration = styleContextStack.getPropertyOrDefault("decoration", null);
				inline.decorationColor = styleContextStack.getPropertyOrDefault("decorationColor", null);
				inline.decorationStyle = styleContextStack.getPropertyOrDefault("decorationStyle", null);
				inline.decorationThickness = styleContextStack.getPropertyOrDefault(
					"decorationThickness",
					null,
				);
				inline.background = styleContextStack.getPropertyOrDefault("background", null);
				inline.link = styleContextStack.getPropertyOrDefault("link", null);
				inline.linkToPage = styleContextStack.getPropertyOrDefault("linkToPage", null);
				inline.linkToDestination = styleContextStack.getPropertyOrDefault(
					"linkToDestination",
					null,
				);
				inline.noWrap = inline.acroform
					? true
					: styleContextStack.getPropertyOrDefault("noWrap", null);
				inline.opacity = styleContextStack.getPropertyOrDefault("opacity", 1);
				inline.sup = styleContextStack.getPropertyOrDefault("sup", false);
				inline.sub = styleContextStack.getPropertyOrDefault("sub", false);

				if (inline.sup || inline.sub) {
					// font size reduction taken from here: https://en.wikipedia.org/wiki/Subscript_and_superscript#Desktop_publishing
					inline.fontSize *= 0.58;
				}

				if (inline.image !== undefined) {
					if (!this.measureInlineImage) {
						throw new Error("Inline image measurement is unavailable");
					}
					const measuredImage = this.measureInlineImage(inline as unknown as MeasuredPdfNode);
					if (measuredImage._kind !== "image") {
						throw new Error("Inline image measurement returned a non-image node");
					}
					inline.image = measuredImage.image as string;
					inline.width = inline._imageWidth = measuredImage._width ?? 0;
					inline.height = inline._imageHeight = measuredImage._height ?? 0;
				} else if (inline.acroform !== undefined) {
					if (!this.measureInlineAcroForm) {
						throw new Error("Inline AcroForm measurement is unavailable");
					}
					const measuredForm = this.measureInlineAcroForm(inline);
					inline.width = measuredForm.width;
					inline.height = measuredForm.height;
				} else {
					inline.width = this.widthOfText(inline.text, inline);
					inline.height = inline.font.lineHeight(inline.fontSize) * textStyle.lineHeight;
				}
				inline.x = 0;

				if (!inline.leadingCut) {
					inline.leadingCut = 0;
				}

				const preserveLeadingSpaces = styleContextStack.getPropertyOrDefault(
					"preserveLeadingSpaces",
					false,
				);
				if (!preserveLeadingSpaces) {
					const leadingSpaces = !isMediaInline ? inline.text.match(LEADING) : null;
					if (leadingSpaces) {
						inline.leadingCut += this.widthOfText(leadingSpaces[0], inline);
					}
				}

				inline.trailingCut = 0;

				const preserveTrailingSpaces = styleContextStack.getPropertyOrDefault(
					"preserveTrailingSpaces",
					false,
				);
				if (!preserveTrailingSpaces) {
					const trailingSpaces = !isMediaInline ? inline.text.match(TRAILING) : null;
					if (trailingSpaces) {
						inline.trailingCut = this.widthOfText(trailingSpaces[0], inline);
					}
				}

				measured.push(inline);
			});
		}, this);

		return measured;
	}

	/**
	 * Width of text
	 *
	 * @param text
	 * @param inline
	 * @returns
	 */
	widthOfText(
		text: string,
		inline: Pick<Inline, "font" | "fontSize"> & {
			fontFeatures?: unknown;
			characterSpacing?: number;
		},
	): number {
		return this.textMetrics.widthOfText(text, inline);
	}

	/**
	 * Returns size of the specified string (without breaking it) using the current style
	 *
	 * @param text text to be measured
	 * @param styleContextStack current style stack
	 * @returns size of the specified string
	 */
	sizeOfText(text: string, styleContextStack: StyleContextStack): TextSize {
		return this.textMetrics.sizeOfText(text, styleContextStack);
	}

	/**
	 * Returns size of the specified rotated string (without breaking it) using the current style
	 *
	 * @param text text to be measured
	 * @param angle
	 * @param styleContextStack current style stack
	 * @returns size of the specified string
	 */
	sizeOfRotatedText(
		text: string,
		angle: number,
		styleContextStack: StyleContextStack,
	): { width: number; height: number } {
		return this.textMetrics.sizeOfRotatedText(text, angle, styleContextStack);
	}

	private requirePdfDocument(): TextFontProvider {
		if (!this.pdfDocument) {
			throw new Error("A PDF document is required for text measurement");
		}
		return this.pdfDocument;
	}
}

export default TextInlines;
