import type { TableNode, TableRow } from "../../types";
import type {
	MeasuredPdfNode,
	PendingMeasureNode,
	PreprocessedPdfNode,
} from "../../types/internal";
import { getLaidOutPageText, getNodeId, unresolvedPageNumberText } from "../../utils/node";
import type { MeasuredTocNode } from "./toc.types";

export type TocMeasureContext = {
	measureNode(node: PendingMeasureNode): MeasuredPdfNode;
	/**
	 * Normalizes a table, in the public table shape, whose cells are already preprocessed.
	 * `dontBreakRows` keeps every row whole, the first one together with the top border.
	 */
	normalizeTable(node: TableNode, options?: { dontBreakRows?: boolean }): PreprocessedPdfNode;
};

export function measureToc(node: MeasuredTocNode, context: TocMeasureContext): MeasuredTocNode {
	const toc = node.toc;
	if (toc.title) {
		toc.title = context.measureNode(toc.title);
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
					text: getLaidOutPageText(item._nodeRef) ?? unresolvedPageNumberText,
					linkToDestination: destination,
					alignment: "right",
					_tocItemRef: item._nodeRef,
					style: lineNumberStyle,
					margin: [0, lineMargin[1], 0, lineMargin[3]],
				},
			]);

			if (toc.outlines) textNode.outline = textNode.outline || true;
		}

		// Entries are presented as a borderless table whose rows never break across pages.
		const tocTable = context.normalizeTable(
			{
				table: {
					widths: ["*", "auto"],
					body: { groups: [{ rows: body as unknown as TableRow[] }], layout: "noBorders" },
				},
			},
			{ dontBreakRows: true },
		);

		toc._table = context.measureNode(tocTable);
	}

	return node;
}
