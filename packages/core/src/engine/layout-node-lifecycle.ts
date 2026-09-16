import type PageElementWriter from "../layout/element-writer.page";
import { getPageSpanHeight } from "../layout/page-item-geometry";
import type { PageOrientation } from "../types";
import type { LayoutPdfNode } from "../types/internal";

export interface VerticalAlignmentStackEntry {
	begin: { item: LayoutPdfNode };
	end: { item: LayoutPdfNode };
}

export interface LayoutNodeLifecycleContext {
	writer: PageElementWriter;
	linearNodeList: LayoutPdfNode[];
	suppressLinearNodeList: boolean;
	verticalAlignmentItemStack: VerticalAlignmentStackEntry[];
	decorateNode(node: LayoutPdfNode): void;
	moveDownWithPageBreak(height: number, pageOrientation?: PageOrientation): void;
	layoutContent(node: LayoutPdfNode): void;
}

function moveToRequestedPage(
	writer: PageElementWriter,
	pageBreak: LayoutPdfNode["pageBreak"],
	pageOrientation: PageOrientation | undefined,
	position: "before" | "after",
): void {
	if (pageBreak === position) {
		writer.moveToNextPage(pageOrientation);
	} else if (pageBreak === `${position}Odd`) {
		writer.moveToNextPage(pageOrientation);
		if ((writer.context().page + 1) % 2 !== 1) writer.moveToNextPage(pageOrientation);
	} else if (pageBreak === `${position}Even`) {
		writer.moveToNextPage(pageOrientation);
		if ((writer.context().page + 1) % 2 !== 0) writer.moveToNextPage(pageOrientation);
	}
}

export function layoutNodeWithLifecycle(
	node: LayoutPdfNode,
	isVerticalAlignmentAllowed: boolean,
	context: LayoutNodeLifecycleContext,
): void {
	if (!context.suppressLinearNodeList) context.linearNodeList.push(node);
	context.decorateNode(node);

	const writer = context.writer;
	const writerContext = writer.context();
	const startPosition = writerContext.getCurrentPage()
		? writerContext.getCurrentPosition()
		: undefined;

	moveToRequestedPage(writer, node.pageBreak, node.pageOrientation, "before");

	const margin = node._margin;
	const isDetachedBlock = Boolean(node.relativePosition || node.absolutePosition);
	if (margin && !isDetachedBlock) {
		context.moveDownWithPageBreak(margin[1], node.pageOrientation);
		writer.context().addMargin(margin[0], margin[2]);
	}

	const verticalAlignment = node.verticalAlignment;
	const verticalAlignmentBegin =
		isVerticalAlignmentAllowed && verticalAlignment
			? writer.beginVerticalAlignment(verticalAlignment)
			: undefined;

	if (node.unbreakable) writer.beginUnbreakableBlock();

	const absolutePosition = node.absolutePosition;
	if (absolutePosition) {
		writer.context().beginDetachedBlock();
		writer.context().moveTo(absolutePosition.x || 0, absolutePosition.y || 0);
	}

	const relativePosition = node.relativePosition;
	if (relativePosition) {
		writer.context().beginDetachedBlock();
		writer.context().moveToRelative(relativePosition.x || 0, relativePosition.y || 0);
	}

	context.layoutContent(node);

	if (absolutePosition || relativePosition) writer.context().endDetachedBlock();
	if (node.unbreakable) writer.commitUnbreakableBlock();

	if (isVerticalAlignmentAllowed && verticalAlignment && verticalAlignmentBegin) {
		context.verticalAlignmentItemStack.push({
			begin: verticalAlignmentBegin as VerticalAlignmentStackEntry["begin"],
			end: writer.endVerticalAlignment(verticalAlignment) as VerticalAlignmentStackEntry["end"],
		});
	}

	if (margin && !isDetachedBlock) {
		writer.context().addMargin(-margin[0], -margin[2]);
		context.moveDownWithPageBreak(margin[3], node.pageOrientation);
	}

	moveToRequestedPage(writer, node.pageBreak, node.pageOrientation, "after");

	if (startPosition) {
		node.__height = getPageSpanHeight(
			startPosition,
			writer.context().getCurrentPosition(),
			writer.context().pages,
		);
	}
}
