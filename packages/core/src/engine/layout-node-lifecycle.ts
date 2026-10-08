import type PageElementWriter from "../layout/element-writer.page";
import { getPageSpanHeight } from "../layout/page-item-geometry";
import type { PageOrientation } from "../types";
import type { LayoutPdfNode, PageControlItem } from "../types/internal";
import type { VerticalAlignmentItem } from "../rendering/renderer.types";

/** Page items that bracket a vertically aligned node; the container that aligns it completes them. */
export type VerticalAlignmentControls = {
	begin: PageControlItem;
	end: PageControlItem;
};

/** Geometry of the box a node is aligned in, read when the page is rendered. */
export type VerticalAlignmentBox = Omit<VerticalAlignmentItem, "verticalAlignment">;

/** Gives the alignment controls of a node the geometry of the box it is aligned in. */
export function completeVerticalAlignment(
	controls: VerticalAlignmentControls,
	box: VerticalAlignmentBox,
): void {
	Object.assign(controls.begin, box);
	controls.end.isContentMultiPage = box.isContentMultiPage;
}

export type LayoutNodeLifecycleContext = {
	writer: PageElementWriter;
	linearNodeList: LayoutPdfNode[];
	suppressLinearNodeList: boolean;
	decorateNode(node: LayoutPdfNode): void;
	moveDownWithPageBreak(height: number, pageOrientation?: PageOrientation): void;
	layoutContent(node: LayoutPdfNode): void;
};

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

/**
 * Lays out a node with the generic lifecycle: page breaks, margins, unbreakable and detached
 * blocks. When vertical alignment is allowed and the node requests it, returns the alignment
 * controls that its container completes with `completeVerticalAlignment`.
 */
export function layoutNodeWithLifecycle(
	node: LayoutPdfNode,
	isVerticalAlignmentAllowed: boolean,
	context: LayoutNodeLifecycleContext,
): VerticalAlignmentControls | undefined {
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

	const alignmentControls =
		verticalAlignment && verticalAlignmentBegin
			? { begin: verticalAlignmentBegin, end: writer.endVerticalAlignment(verticalAlignment) }
			: undefined;

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
	return alignmentControls;
}
