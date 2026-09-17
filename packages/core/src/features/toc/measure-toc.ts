import type { MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { getNodeId } from "../../utils/node";
import type { MeasuredTocNode } from "./toc.types";

export interface TocMeasureContext {
	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode;
}

export function measureToc(node: MeasuredTocNode, context: TocMeasureContext): MeasuredTocNode {
	const toc = node.toc;
	if (toc.title) {
		toc.title = context.measureNode(toc.title as unknown as PreprocessedPdfNode);
	}

	if (toc._items.length > 0) {
		const body: PreprocessedPdfNode[][] = [];
		const textStyle = toc.textStyle || {};
		const numberStyle = toc.numberStyle || textStyle;
		const textMargin: [number, number, number, number] =
			Array.isArray(toc.textMargin) && toc.textMargin.length === 4
				? (toc.textMargin as [number, number, number, number])
				: [0, 0, 0, 0];

		if (toc.sortBy === "title") {
			toc._items.sort((a, b) => {
				const aText = a._textNodeRef?._kind === "text" ? a._textNodeRef.text : "";
				const bText = b._textNodeRef?._kind === "text" ? b._textNodeRef.text : "";
				return String(aText).localeCompare(String(bText), toc.sortLocale);
			});
		}

		for (const item of toc._items) {
			const textNode = item._textNodeRef!;
			if (textNode._kind !== "text") {
				throw new Error("Internal measurement error: expected a text TOC item");
			}
			const lineStyle = textNode.tocStyle || textStyle;
			const lineMargin =
				Array.isArray(textNode.tocMargin) && textNode.tocMargin.length === 4
					? textNode.tocMargin
					: textMargin;
			const lineNumberStyle = textNode.tocNumberStyle || numberStyle;
			const destination = getNodeId(item._nodeRef) ?? undefined;
			body.push([
				{
					_kind: "text",
					text: textNode.text,
					linkToDestination: destination,
					alignment: "left",
					style: lineStyle,
					margin: lineMargin,
				},
				{
					_kind: "text",
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
			_kind: "table",
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
