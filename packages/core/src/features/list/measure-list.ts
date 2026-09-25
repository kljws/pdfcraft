import StyleContextStack from "../../services/styles/style-context-stack";
import type { Color } from "../../types";
import type {
	Inline,
	MeasuredPdfNode,
	PendingMeasureNode,
	TextMeasurement,
} from "../../types/internal";
import { isNumber } from "../../utils/variable-type";
import { buildUnorderedMarker, formatOrderedMarker } from "./list-markers";
import type { ListMeasureNode, MeasuredListItem, MeasuredListNode } from "./list.types";

export interface ListMeasureContext {
	styles: StyleContextStack;
	measureNode(node: PendingMeasureNode): MeasuredPdfNode;
	measureGap(): TextMeasurement;
	buildMarkerInlines(text: string, color: Color, styles: StyleContextStack): Inline[];
}

export function measureUnorderedList(
	node: ListMeasureNode,
	context: ListMeasureContext,
): MeasuredListNode {
	const style = context.styles.clone();
	const items = node.ul!;
	node.type ||= "disc";
	const measuredNode = node as MeasuredListNode;
	measuredNode.metrics = { gapSize: context.measureGap() };
	const { gapSize } = measuredNode.metrics;
	node._minWidth = 0;
	node._maxWidth = 0;

	for (let index = 0; index < items.length; index++) {
		const item: MeasuredListItem = (items[index] = context.measureNode(items[index]));
		if (item._kind !== "list") {
			item.listMarker = buildUnorderedMarker(item, style, gapSize, item.listType || node.type);
		}

		node._minWidth = Math.max(node._minWidth, (item._minWidth ?? 0) + gapSize.width);
		node._maxWidth = Math.max(node._maxWidth, (item._maxWidth ?? 0) + gapSize.width);
	}

	return measuredNode;
}

export function measureOrderedList(
	node: ListMeasureNode,
	context: ListMeasureContext,
): MeasuredListNode {
	const style = context.styles.clone();
	const items = node.ol!;
	node.type ||= "decimal";
	node.separator ||= ".";
	node.reversed ||= false;
	if (!isNumber(node.start)) node.start = node.reversed ? items.length : 1;
	const measuredNode = node as MeasuredListNode;
	measuredNode.metrics = { gapSize: context.measureGap() };
	const { gapSize } = measuredNode.metrics;
	node._minWidth = 0;
	node._maxWidth = 0;

	let counter = node.start;
	for (let index = 0; index < items.length; index++) {
		const item: MeasuredListItem = (items[index] = context.measureNode(items[index]));
		if (item._kind !== "list") {
			const counterValue = isNumber(item.counter) ? item.counter : counter;
			const counterText = formatOrderedMarker(
				counterValue,
				item.listType || node.type,
				node.separator,
			);
			if (counterText === null) {
				item.listMarker = { _minWidth: 0, _maxWidth: 0 };
			} else {
				const markerColor = (StyleContextStack.getStyleProperty(
					item,
					style,
					"markerColor",
					undefined,
				) ||
					style.getProperty("color") ||
					"black") as Color;
				item.listMarker = {
					_inlines: context.buildMarkerInlines(counterText, markerColor, style),
					_minWidth: 0,
					_maxWidth: 0,
				};
			}

			if (item.listMarker?._inlines) {
				gapSize.width = Math.max(gapSize.width, item.listMarker._inlines[0].width);
			}
			counter += node.reversed ? -1 : 1;
		}

		node._minWidth = Math.max(node._minWidth, item._minWidth ?? 0);
		node._maxWidth = Math.max(node._maxWidth, item._maxWidth ?? 0);
	}

	node._minWidth += gapSize.width;
	node._maxWidth += gapSize.width;
	for (const item of items) {
		if (item._kind !== "list" && item.listMarker) {
			item.listMarker._minWidth = item.listMarker._maxWidth = gapSize.width;
		}
	}

	return measuredNode;
}
