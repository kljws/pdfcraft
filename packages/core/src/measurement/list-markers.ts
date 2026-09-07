import StyleContextStack from "../layout/style-context-stack";
import type { ListMarker, MeasuredPdfNode, TextMeasurement, Vector } from "../types/internal";

function markerVector(
	type: "disc" | "circle" | "square",
	gapSize: TextMeasurement,
	color: string,
): Vector {
	if (type === "square") {
		const size = gapSize.fontSize / 3;
		return {
			type: "rect",
			x: 0,
			y: gapSize.height / gapSize.lineHeight + gapSize.descender - gapSize.fontSize / 3 - size / 2,
			h: size,
			w: size,
			color,
		};
	}

	const radius = gapSize.fontSize / 6;
	return {
		type: "ellipse",
		x: radius,
		y: gapSize.height / gapSize.lineHeight + gapSize.descender - gapSize.fontSize / 3,
		r1: radius,
		r2: radius,
		...(type === "circle" ? { lineColor: color } : { color }),
	};
}

export function buildUnorderedMarker(
	item: MeasuredPdfNode,
	styleStack: StyleContextStack,
	gapSize: TextMeasurement,
	type: string,
): ListMarker {
	const color =
		StyleContextStack.getStyleProperty(item, styleStack, "markerColor", undefined) ||
		styleStack.getProperty("color") ||
		"black";
	const markerContent: Pick<ListMarker, "canvas"> =
		type === "none"
			? {}
			: {
					canvas: [
						markerVector(
							type === "circle" || type === "square" ? type : "disc",
							gapSize,
							color as string,
						),
					],
				};

	return {
		...markerContent,
		_minWidth: gapSize.width,
		_maxWidth: gapSize.width,
		_minHeight: gapSize.height,
		_maxHeight: gapSize.height,
	};
}

function alphaCounter(counter: number): string {
	const toAlpha = (value: number): string =>
		(value >= 26 ? toAlpha(Math.floor(value / 26) - 1) : "") +
		"abcdefghijklmnopqrstuvwxyz"[value % 26];
	return counter < 1 ? counter.toString() : toAlpha(counter - 1);
}

function romanCounter(counter: number): string {
	if (counter < 1 || counter > 4999) {
		return counter.toString();
	}
	const numerals: Record<string, number> = {
		M: 1000,
		CM: 900,
		D: 500,
		CD: 400,
		C: 100,
		XC: 90,
		L: 50,
		XL: 40,
		X: 10,
		IX: 9,
		V: 5,
		IV: 4,
		I: 1,
	};
	let value = counter;
	let result = "";
	for (const numeral in numerals) {
		while (value >= numerals[numeral]) {
			result += numeral;
			value -= numerals[numeral];
		}
	}
	return result;
}

export function formatOrderedMarker(
	counter: number,
	type: string,
	separator: string | [string, string] | undefined,
): string | null {
	let text: string | null;
	switch (type) {
		case "none":
			return null;
		case "upper-alpha":
			text = alphaCounter(counter).toUpperCase();
			break;
		case "lower-alpha":
			text = alphaCounter(counter);
			break;
		case "upper-roman":
			text = romanCounter(counter);
			break;
		case "lower-roman":
			text = romanCounter(counter).toLowerCase();
			break;
		default:
			text = counter.toString();
	}

	if (Array.isArray(separator)) {
		return `${separator[0] || ""}${text}${separator[1] || ""} `;
	}
	return separator ? `${text}${separator} ` : text;
}
