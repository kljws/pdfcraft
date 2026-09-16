import StyleContextStack from "../../services/styles/style-context-stack";
import type { Color } from "../../types";
import type {
	Inline,
	MeasuredPdfNode,
	PreprocessedPdfNode,
	TextMeasurement,
} from "../../types/internal";
import { isNumber } from "../../utils/variable-type";
import { buildUnorderedMarker, formatOrderedMarker } from "./list-markers";

export interface ListMeasureContext {
	styles: StyleContextStack;
	measureChild(node: PreprocessedPdfNode): MeasuredPdfNode;
	measureGap(): TextMeasurement;
	buildMarkerInlines(text: string, color: Color, styles: StyleContextStack): Inline[];
}

export function measureUnorderedList(
	node: MeasuredPdfNode,
	context: ListMeasureContext,
): MeasuredPdfNode {
	const style = context.styles.clone();
	const items = node.ul!;
	node.type ||= "disc";
	node._gapSize = context.measureGap();
	node._minWidth = 0;
	node._maxWidth = 0;

	for (let index = 0; index < items.length; index++) {
		const item = (items[index] = context.measureChild(items[index]));
		if (!item.ol && !item.ul) {
			item.listMarker = buildUnorderedMarker(
				item,
				style,
				node._gapSize,
				item.listType || node.type,
			);
		}

		node._minWidth = Math.max(node._minWidth, (item._minWidth ?? 0) + node._gapSize.width);
		node._maxWidth = Math.max(node._maxWidth, (item._maxWidth ?? 0) + node._gapSize.width);
	}

	return node;
}

export function measureOrderedList(
	node: MeasuredPdfNode,
	context: ListMeasureContext,
): MeasuredPdfNode {
	const style = context.styles.clone();
	const items = node.ol!;
	node.type ||= "decimal";
	node.separator ||= ".";
	node.reversed ||= false;
	if (!isNumber(node.start)) node.start = node.reversed ? items.length : 1;
	node._gapSize = context.measureGap();
	node._minWidth = 0;
	node._maxWidth = 0;

	let counter = node.start;
	for (let index = 0; index < items.length; index++) {
		const item = (items[index] = context.measureChild(items[index]));
		if (!item.ol && !item.ul) {
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
				node._gapSize.width = Math.max(node._gapSize.width, item.listMarker._inlines[0].width);
			}
			counter += node.reversed ? -1 : 1;
		}

		node._minWidth = Math.max(node._minWidth, item._minWidth ?? 0);
		node._maxWidth = Math.max(node._maxWidth, item._maxWidth ?? 0);
	}

	node._minWidth += node._gapSize.width;
	node._maxWidth += node._gapSize.width;
	for (const item of items) {
		if (!item.ol && !item.ul && item.listMarker) {
			item.listMarker._minWidth = item.listMarker._maxWidth = node._gapSize.width;
		}
	}

	return node;
}
