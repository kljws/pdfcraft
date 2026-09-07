import ColumnCalculator from "../layout/column-calculator";
import StyleContextStack from "../layout/style-context-stack";
import type TextInlines from "../text/text-inlines";
import type { Color } from "../types";
import type {
	ColumnNode,
	ListMarker,
	MeasuredPdfNode,
	PreprocessedPdfNode,
} from "../types/internal";
import { isNumber } from "../utils/variable-type";
import { buildUnorderedMarker, formatOrderedMarker } from "./list-markers";

class DocMeasureContainers {
	constructor(
		private readonly textInlines: TextInlines,
		private readonly styleStack: StyleContextStack,
		private readonly measureChild: (node: PreprocessedPdfNode) => MeasuredPdfNode,
	) {}

	measureVerticalContainer(node: MeasuredPdfNode): MeasuredPdfNode {
		const items = node.stack!;
		node._minWidth = 0;
		node._maxWidth = 0;

		for (let index = 0; index < items.length; index++) {
			items[index] = this.measureChild(items[index]);
			node._minWidth = Math.max(node._minWidth, items[index]._minWidth ?? 0);
			node._maxWidth = Math.max(node._maxWidth, items[index]._maxWidth ?? 0);
		}

		return node;
	}

	gapSizeForList(): ReturnType<TextInlines["sizeOfText"]> {
		return this.textInlines.sizeOfText("9. ", this.styleStack);
	}

	buildUnorderedMarker(
		item: MeasuredPdfNode,
		styleStack: StyleContextStack,
		gapSize: ReturnType<TextInlines["sizeOfText"]>,
		type: string,
	): ListMarker {
		return buildUnorderedMarker(item, styleStack, gapSize, type);
	}

	buildOrderedMarker(
		item: MeasuredPdfNode,
		counter: number,
		styleStack: StyleContextStack,
		type: string,
		separator: string | [string, string] | undefined,
	): ListMarker {
		const counterText = formatOrderedMarker(counter, type, separator);
		if (counterText === null) {
			return { _minWidth: 0, _maxWidth: 0 };
		}

		const markerColor = (StyleContextStack.getStyleProperty(
			item,
			styleStack,
			"markerColor",
			undefined,
		) ||
			styleStack.getProperty("color") ||
			"black") as Color;

		return {
			_inlines: this.textInlines.buildInlines({ text: counterText, color: markerColor }, styleStack)
				.items,
			_minWidth: 0,
			_maxWidth: 0,
		};
	}

	measureUnorderedList(node: MeasuredPdfNode): MeasuredPdfNode {
		const style = this.styleStack.clone();
		const items = node.ul!;
		node.type ||= "disc";
		node._gapSize = this.gapSizeForList();
		node._minWidth = 0;
		node._maxWidth = 0;

		for (let index = 0; index < items.length; index++) {
			const item = (items[index] = this.measureChild(items[index]));
			if (!item.ol && !item.ul) {
				item.listMarker = this.buildUnorderedMarker(
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

	measureOrderedList(node: MeasuredPdfNode): MeasuredPdfNode {
		const style = this.styleStack.clone();
		const items = node.ol!;
		node.type ||= "decimal";
		node.separator ||= ".";
		node.reversed ||= false;
		if (!isNumber(node.start)) {
			node.start = node.reversed ? items.length : 1;
		}
		node._gapSize = this.gapSizeForList();
		node._minWidth = 0;
		node._maxWidth = 0;

		let counter = node.start;
		for (let index = 0; index < items.length; index++) {
			const item = (items[index] = this.measureChild(items[index]));
			if (!item.ol && !item.ul) {
				const counterValue = isNumber(item.counter) ? item.counter : counter;
				item.listMarker = this.buildOrderedMarker(
					item,
					counterValue,
					style,
					item.listType || node.type,
					node.separator,
				);
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

	measureSection(node: MeasuredPdfNode): MeasuredPdfNode {
		node.section = this.measureChild(node.section!);
		return node;
	}

	measureColumns(node: MeasuredPdfNode): MeasuredPdfNode {
		const columns = node.columns!;
		const columnGap = this.styleStack.getProperty("columnGap");
		node._gap = typeof columnGap === "number" ? columnGap : 0;

		for (let index = 0; index < columns.length; index++) {
			columns[index] = this.measureChild(columns[index]) as ColumnNode<MeasuredPdfNode>;
		}

		const measures = ColumnCalculator.measureMinMax(columns);
		const gapCount = Math.max(0, columns.length - 1);
		node._minWidth = measures.min + node._gap * gapCount;
		node._maxWidth = measures.max + node._gap * gapCount;
		return node;
	}
}

export default DocMeasureContainers;
