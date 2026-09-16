import Line from "../../layout/line";
import type { Inline } from "../../types/internal";
import TextInlines from "./text-inlines";
import type { LayoutTextNode } from "./text.types";

const cloneInline = (inline: Inline): Inline =>
	Object.assign(Object.create(Object.getPrototypeOf(inline)) as Inline, inline);

const findMaxFitLength = (
	text: string,
	maxWidth: number,
	measure: (text: string) => number,
): number => {
	let low = 1;
	let high = text.length;
	let bestFit = 1;

	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const width = measure(text.substring(0, middle));
		if (width <= maxWidth) {
			bestFit = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}

	return bestFit;
};

export function buildTextLine(textNode: LayoutTextNode, availableWidth: number): Line | null {
	if (textNode.metrics.inlines.length === 0) return null;

	const line = new Line(availableWidth);
	const textInlines = new TextInlines(null);
	const inlines = textNode.metrics.inlines;
	let consumedInlineCount = 0;
	let forceContinue = false;

	while (
		consumedInlineCount < inlines.length &&
		(line.hasEnoughSpaceForInline(inlines[consumedInlineCount], inlines, consumedInlineCount + 1) ||
			forceContinue)
	) {
		let hardWrap = false;
		const inline = inlines[consumedInlineCount];

		if (!inline.noWrap && inline.text.length > 1 && inline.width > line.getAvailableWidth()) {
			const maxChars = findMaxFitLength(inline.text, line.getAvailableWidth(), (text) =>
				textInlines.widthOfText(text, inline),
			);
			if (maxChars < inline.text.length) {
				const newInline = cloneInline(inline);
				newInline.text = inline.text.substr(maxChars);
				inline.text = inline.text.substr(0, maxChars);
				newInline.width = textInlines.widthOfText(newInline.text, newInline);
				inline.width = textInlines.widthOfText(inline.text, inline);
				inlines.splice(consumedInlineCount + 1, 0, newInline);
				hardWrap = true;
			}
		}

		line.addInline(inline);
		consumedInlineCount++;
		forceContinue = Boolean(inline.noNewLine && !hardWrap);
	}

	inlines.splice(0, consumedInlineCount);
	line.lastLineInParagraph = inlines.length === 0;
	return line;
}
