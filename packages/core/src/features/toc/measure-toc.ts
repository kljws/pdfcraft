import type { MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { getNodeId } from "../../utils/node";

export interface TocMeasureContext {
	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode;
}

export function measureToc(node: MeasuredPdfNode, context: TocMeasureContext): MeasuredPdfNode {
	const toc = node.toc!;
	if (toc.title) toc.title = context.measureNode(toc.title);

	if (toc._items.length > 0) {
		const body: PreprocessedPdfNode[][] = [];
		const textStyle = toc.textStyle || {};
		const numberStyle = toc.numberStyle || textStyle;
		const textMargin: [number, number, number, number] =
			Array.isArray(toc.textMargin) && toc.textMargin.length === 4
				? (toc.textMargin as [number, number, number, number])
				: [0, 0, 0, 0];

		if (toc.sortBy === "title") {
			toc._items.sort((a, b) =>
				String(a._textNodeRef?.text).localeCompare(String(b._textNodeRef?.text), toc.sortLocale),
			);
		}

		for (const item of toc._items) {
			const textNode = item._textNodeRef!;
			const lineStyle = textNode.tocStyle || textStyle;
			const lineMargin =
				Array.isArray(textNode.tocMargin) && textNode.tocMargin.length === 4
					? textNode.tocMargin
					: textMargin;
			const lineNumberStyle = textNode.tocNumberStyle || numberStyle;
			const destination = getNodeId(item._nodeRef) ?? undefined;
			body.push([
				{
					text: textNode.text,
					linkToDestination: destination,
					alignment: "left",
					style: lineStyle,
					margin: lineMargin,
				},
				{
					text: "00000",
					linkToDestination: destination,
					alignment: "right",
					_tocItemRef: item._nodeRef,
					style: lineNumberStyle,
					margin: [0, lineMargin[1], 0, lineMargin[3]],
				},
			]);

			if (toc.outlines) textNode.outline = textNode.outline || true;
		}

		const tocTable: PreprocessedPdfNode = {
			table: {
				dontBreakRows: true,
				widths: ["*", "auto"],
				body,
			},
			layout: "noBorders",
		};

		toc._table = context.measureNode(tocTable);
	}

	return node;
}
