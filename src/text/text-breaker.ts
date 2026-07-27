import LineBreaker from "linebreak";
import { isObject } from "../utils/variable-type";
import StyleContextStack from "../layout/style-context-stack";
import type { PdfNode } from "../types/internal";
import type { BrokenInline, BrokenWord, TextFragment } from "./text.types";

const splitWords = (input: unknown, noWrap: boolean, breakAll: boolean = false): BrokenWord[] => {
	const words: BrokenWord[] = [];
	let text: string;
	if (input === undefined || input === null) {
		text = "";
	} else {
		text = String(input);
	}

	if (noWrap) {
		words.push({ text: text });
		return words;
	}
	if (breakAll) {
		return text.split("").map((character): BrokenWord => {
			if (character.match(/^\n$|^\r$/)) {
				// new line
				return { text: "", lineEnd: true };
			}
			return { text: character };
		});
	}

	if (text.length === 0) {
		words.push({ text: "" });
		return words;
	}

	let breaker = new LineBreaker(text);
	let last = 0;
	let bk;

	while ((bk = breaker.nextBreak())) {
		let word = text.slice(last, bk.position);

		if (bk.required || word.match(/\r?\n$|\r$/)) {
			// new line
			word = word.replace(/\r?\n$|\r$/, "");
			words.push({ text: word, lineEnd: true });
		} else {
			words.push({ text: word });
		}

		last = bk.position;
	}

	return words;
};

const getFirstWord = (words: BrokenWord[], noWrap: boolean): string | null => {
	let word = words[0];
	if (word === undefined) {
		return null;
	}

	if (noWrap) {
		// text was not wrapped, we need only first word
		let tmpWords = splitWords(word.text, false);
		if (tmpWords[0] === undefined) {
			return null;
		}
		word = tmpWords[0];
	}

	return word.text;
};

const getLastWord = (words: BrokenWord[], noWrap: boolean): string | null => {
	let word = words[words.length - 1];
	if (word === undefined) {
		return null;
	}

	if (word.lineEnd) {
		return null;
	}

	if (noWrap) {
		// text was not wrapped, we need only last word
		let tmpWords = splitWords(word.text, false);
		if (tmpWords[tmpWords.length - 1] === undefined) {
			return null;
		}
		word = tmpWords[tmpWords.length - 1];
	}

	return word.text;
};

class TextBreaker {
	getBreaks(
		input: TextFragment | TextFragment[],
		styleContextStack: StyleContextStack = new StyleContextStack(null),
	): BrokenInline[] {
		const results: BrokenInline[] = [];
		const texts = Array.isArray(input) ? input : [input];

		let lastWord: string | null = null;
		for (let i = 0, l = texts.length; i < l; i++) {
			let item = texts[i];
			const styleItem = isObject(item) ? (item as PdfNode) : {};
			if (styleItem.image) {
				results.push({ ...styleItem, text: "" });
				lastWord = null;
				continue;
			}
			if (styleItem.acroform) {
				results.push({ ...styleItem, text: "" });
				lastWord = null;
				continue;
			}
			let style: Record<string, unknown> | null = null;
			let words: BrokenWord[];
			let breakAll =
				StyleContextStack.getStyleProperty(styleItem, styleContextStack, "wordBreak", "normal") ===
				"break-all";
			let noWrap = StyleContextStack.getStyleProperty(
				styleItem,
				styleContextStack,
				"noWrap",
				false,
			);
			if (isObject(item)) {
				const node = item as PdfNode;
				const textReference = node._textRef;
				if (isObject(textReference) && isObject(textReference._textNodeRef)) {
					const referencedText = textReference._textNodeRef.text;
					if (referencedText) {
						node.text = referencedText;
					}
				}
				words = splitWords(node.text, noWrap, breakAll);
				style = StyleContextStack.copyStyle(node);
			} else {
				words = splitWords(item, noWrap, breakAll);
			}

			if (lastWord && words.length) {
				const firstWord = getFirstWord(words, noWrap);

				const joinsPreviousInline = firstWord !== null && !/^\s/u.test(firstWord);
				const wrapWords = joinsPreviousInline ? splitWords(lastWord + firstWord, false) : [];
				if (wrapWords.length === 1) {
					results[results.length - 1].noNewLine = true;
				}
			}

			for (let i2 = 0, l2 = words.length; i2 < l2; i2++) {
				const result: BrokenInline = {
					text: words[i2].text,
				};

				if (words[i2].lineEnd) {
					result.lineEnd = true;
				}

				StyleContextStack.copyStyle(style, result);

				results.push(result);
			}

			lastWord = null;
			if (i + 1 < l) {
				lastWord = getLastWord(words, noWrap);
			}
		}

		return results;
	}
}

export default TextBreaker;
