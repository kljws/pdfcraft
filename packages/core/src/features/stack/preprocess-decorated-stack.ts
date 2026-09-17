import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode } from "../../utils/node";
import { isNumber, isString } from "../../utils/variable-type";

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

export interface DecoratedStackPreprocessContext {
	allowSections: boolean;
	preprocessTable(node: PdfNode, allowSections: boolean): PreprocessedPdfNode;
}

export function preprocessDecoratedStack(
	node: PdfNode,
	context: DecoratedStackPreprocessContext,
): PreprocessedPdfNode {
	const block = node as unknown as Record<string, unknown>;
	for (const property of ["borderRadius", "borderWidth"] as const) {
		const value = block[property];
		if (value !== undefined && (!isNumber(value) || !Number.isFinite(value) || value < 0)) {
			throw new Error(
				`Invalid stack node: '${property}' must be a finite non-negative number, received ${stringifyNode(value)}`,
			);
		}
	}
	for (const property of ["borderColor", "backgroundColor"] as const) {
		const value = block[property];
		if (value !== undefined && !isColor(value)) {
			throw new Error(
				`Invalid stack node: '${property}' must be a color, received ${stringifyNode(value)}`,
			);
		}
	}

	const borderRadius = (block.borderRadius as number | undefined) ?? 0;
	const borderWidth = (block.borderWidth as number | undefined) ?? 0;
	const borderColor = block.borderColor ?? "black";
	const backgroundColor = block.backgroundColor;
	const padding = block.padding === undefined ? [0, 0, 0, 0] : resolveBlockPadding(block.padding);
	const content = node.stack;
	if (!content) throw new Error("Internal preprocessing error: expected a stack node");
	const layout = {
		hLineWidth: (index: number, tableNode: PdfNode) =>
			index === 0 || index === (tableNode.table?.body.length ?? 0) ? borderWidth : 0,
		vLineWidth: (index: number, tableNode: PdfNode) =>
			index === 0 || index === (tableNode.table?.body[0]?.length ?? 0) ? borderWidth : 0,
		hLineColor: borderColor,
		vLineColor: borderColor,
		paddingLeft: () => padding[0],
		paddingTop: () => padding[1],
		paddingRight: () => padding[2],
		paddingBottom: () => padding[3],
		fillColor: backgroundColor,
	};

	node.table = {
		borderRadius,
		widths: ["*"],
		body: {
			groups: [{ rows: [[{ stack: content }]] }],
			layout,
		},
		_blockContainer: true,
	} as unknown as PdfNode["table"];
	delete node.stack;
	for (const property of [
		"borderRadius",
		"borderWidth",
		"borderColor",
		"backgroundColor",
		"padding",
	]) {
		delete block[property];
	}

	return context.preprocessTable(node, context.allowSections);
}
