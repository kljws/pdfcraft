import Line from "../../layout/line";
import type PageElementWriter from "../../layout/element-writer.page";
import type { LayoutPdfNode, LineLike } from "../../types/internal";
import { offsetVector } from "../../utils/tools";
import type { LayoutListNode, ListMarker } from "./list.types";

export type ListLayoutContext = {
	writer: PageElementWriter;
	ordered: boolean;
	getPageWidth(): number;
	isLinearNodeListSuppressed(): boolean;
	processNode(node: LayoutPdfNode): void;
};

export function layoutList(node: LayoutListNode, context: ListLayoutContext): void {
	let nextMarker: ListMarker | null = null;
	const addMarkerToFirstLeaf = (line: LineLike): void => {
		if (nextMarker && !context.isLinearNodeListSuppressed()) {
			const marker = nextMarker;
			nextMarker = null;

			const vector = marker.canvas?.[0];
			const inline = marker._inlines?.[0];
			if (vector) {
				offsetVector(vector, -marker._minWidth, 0);
				context.writer.addVector(vector);
			} else if (inline) {
				const markerLine = new Line(context.getPageWidth());
				markerLine.addInline(inline);
				markerLine.x = -marker._minWidth;
				markerLine.y = line.getAscenderHeight() - markerLine.getAscenderHeight();
				context.writer.addLine(markerLine, true);
			}
		}
	};

	const items = context.ordered ? node.ol : node.ul;
	if (!items) throw new Error("Internal layout error: expected a preprocessed list node");
	const { gapSize } = node.metrics;
	node.positions ??= [];
	const positions = node.positions;

	context.writer.context().addMargin(gapSize.width);
	context.writer.addListener("lineAdded", addMarkerToFirstLeaf);

	for (const item of items) {
		nextMarker = item.listMarker ?? null;
		context.processNode(item);
		positions.push(...(item.positions ?? []));
	}

	context.writer.removeListener("lineAdded", addMarkerToFirstLeaf);
	context.writer.context().addMargin(-gapSize.width);
}
