import { isNumber, isString } from "./variable-type";
import type StyleContextStack from "../layout/style-context-stack";
import type { NodeStyleValue } from "../types/internal";

type PartialMargin = [
	left: number | undefined,
	top: number | undefined,
	right: number | undefined,
	bottom: number | undefined,
];
export type NodeMargin = [left: number, top: number, right: number, bottom: number];

function fontStringify(key: string, value: unknown): unknown {
	if (key === "font") {
		return "font";
	}
	return value;
}

/**
 * Convert node to readable string
 *
 * @param node
 * @returns
 */
export function stringifyNode(node: unknown): string {
	return JSON.stringify(node, fontStringify);
}

export function getNodeId(node: { id?: unknown; text?: unknown }): string | null {
	if (isString(node.id)) {
		return node.id;
	}

	if (Array.isArray(node.text)) {
		for (const n of node.text) {
			if (!n || typeof n !== "object") {
				continue;
			}
			const nodeId = getNodeId(n);
			if (nodeId) {
				return nodeId;
			}
		}
	}

	return null;
}

/**
 * @param node
 * @param styleStack object is instance of PDFDocument
 * @returns
 */
export function getNodeMargin(
	node: {
		style?: NodeStyleValue;
		margin?: unknown;
		marginLeft?: unknown;
		marginTop?: unknown;
		marginRight?: unknown;
		marginBottom?: unknown;
	},
	styleStack: StyleContextStack,
): NodeMargin | null {
	function processSingleMargins(
		value: Record<string, unknown>,
		currentMargin: PartialMargin,
		defaultMargin: number | undefined = 0,
	): PartialMargin {
		if (
			value.marginLeft !== undefined ||
			value.marginTop !== undefined ||
			value.marginRight !== undefined ||
			value.marginBottom !== undefined
		) {
			return [
				toMarginValue(value.marginLeft, currentMargin[0], defaultMargin),
				toMarginValue(value.marginTop, currentMargin[1], defaultMargin),
				toMarginValue(value.marginRight, currentMargin[2], defaultMargin),
				toMarginValue(value.marginBottom, currentMargin[3], defaultMargin),
			];
		}
		return currentMargin;
	}

	function flattenStyleArray(
		styleValue: unknown,
		visited: Set<string> = new Set(),
	): { margin?: PartialMargin } {
		const styleArray = Array.isArray(styleValue) ? styleValue : [styleValue];

		// style is not valid array of strings
		if (!styleArray.every((item) => isString(item))) {
			return {};
		}

		let flattenedStyles: { margin?: PartialMargin } = {};
		for (let index = 0; index < styleArray.length; index++) {
			const styleName = styleArray[index];
			const style = styleStack.styleDictionary[styleName];

			// style not found
			if (style === undefined) {
				continue;
			}

			if (visited.has(styleName)) {
				continue;
			}

			if (style.extends !== undefined) {
				flattenedStyles = {
					...flattenedStyles,
					...flattenStyleArray(style.extends, new Set([...visited, styleName])),
				};
			}

			if (style.margin !== undefined) {
				flattenedStyles = { margin: convertMargin(style.margin) };
				continue;
			}

			flattenedStyles = {
				margin: processSingleMargins(
					style as Record<string, unknown>,
					flattenedStyles.margin ?? [undefined, undefined, undefined, undefined],
					undefined,
				),
			};
		}

		return flattenedStyles;
	}

	function convertMargin(margin: unknown): PartialMargin {
		if (isNumber(margin)) {
			return [margin, margin, margin, margin];
		} else if (Array.isArray(margin)) {
			if (margin.length === 2) {
				return [margin[0], margin[1], margin[0], margin[1]].map(toOptionalNumber) as PartialMargin;
			}
			if (margin.length === 4) {
				return margin.map(toOptionalNumber) as PartialMargin;
			}
		}
		return [undefined, undefined, undefined, undefined];
	}

	let margin: PartialMargin = [undefined, undefined, undefined, undefined];

	if (node.style) {
		const styleArray = Array.isArray(node.style) ? node.style : [node.style];
		const flattenedStyleArray = flattenStyleArray(styleArray);

		if (flattenedStyleArray) {
			margin = processSingleMargins(flattenedStyleArray, margin);
		}

		if (flattenedStyleArray.margin) {
			margin = convertMargin(flattenedStyleArray.margin);
		}
	}

	margin = processSingleMargins(node as Record<string, unknown>, margin);

	if (node.margin !== undefined) {
		margin = convertMargin(node.margin);
	}

	if (
		margin[0] === undefined &&
		margin[1] === undefined &&
		margin[2] === undefined &&
		margin[3] === undefined
	) {
		return null;
	}

	return margin.map((value) => value ?? 0) as NodeMargin;
}

function toOptionalNumber(value: unknown): number | undefined {
	return isNumber(value) ? value : undefined;
}

function toMarginValue(
	value: unknown,
	currentValue: number | undefined,
	defaultValue: number | undefined,
): number | undefined {
	return toOptionalNumber(value) ?? currentValue ?? defaultValue;
}
