import type { Color } from "../../types";
import type { PdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";
import { isNumber, isString } from "../../utils/variable-type";
import type { StackDecoration } from "./stack.types";

type ResolvedBlockPadding = [left: number, top: number, right: number, bottom: number];

const resolveBlockPadding = (value: unknown): ResolvedBlockPadding => {
	const values = isNumber(value)
		? [value, value, value, value]
		: Array.isArray(value) && value.length === 2
			? [value[0], value[1], value[0], value[1]]
			: Array.isArray(value) && value.length === 4
				? value
				: null;
	if (!values || !values.every((item) => isNumber(item) && Number.isFinite(item) && item >= 0)) {
		throw new Error(
			`Invalid stack node: 'padding' must be a finite non-negative number or a two/four-number array, received ${stringifyNode(value)}`,
		);
	}
	return values as ResolvedBlockPadding;
};

const isColor = (value: unknown): boolean =>
	isString(value) ||
	(Array.isArray(value) && value.length === 2 && value.every((part) => isString(part)));

const decorationProperties = [
	"borderRadius",
	"borderWidth",
	"borderColor",
	"backgroundColor",
	"padding",
] as const;

/** Whether a stack node declares a block decoration (padding, background, border or radius). */
export function hasStackDecoration(node: PdfNode): boolean {
	return (
		node.borderRadius !== undefined ||
		node.borderWidth !== undefined ||
		node.backgroundColor !== undefined ||
		node.padding !== undefined
	);
}

/**
 * Validates the decoration of a stack and moves it from the node's public properties to the
 * resolved decoration, so that descendants do not inherit those properties as styles.
 */
export function resolveStackDecoration(node: PdfNode): StackDecoration {
	for (const property of ["borderRadius", "borderWidth"] as const) {
		const value: unknown = node[property];
		if (value !== undefined && (!isNumber(value) || !Number.isFinite(value) || value < 0)) {
			throw new Error(
				`Invalid stack node: '${property}' must be a finite non-negative number, received ${stringifyNode(value)}`,
			);
		}
	}
	for (const property of ["borderColor", "backgroundColor"] as const) {
		const value: unknown = node[property];
		if (value !== undefined && !isColor(value)) {
			throw new Error(
				`Invalid stack node: '${property}' must be a color, received ${stringifyNode(value)}`,
			);
		}
	}

	const decoration: StackDecoration = {
		borderRadius: node.borderRadius ?? 0,
		borderWidth: node.borderWidth ?? 0,
		borderColor: (node.borderColor ?? "black") as unknown as Color,
		backgroundColor: node.backgroundColor,
		padding: node.padding === undefined ? [0, 0, 0, 0] : resolveBlockPadding(node.padding),
	};
	for (const property of decorationProperties) delete node[property];
	return decoration;
}
