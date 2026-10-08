import type { NodeLayoutContext } from "../../engine/contracts/node-feature";
import type PageElementWriter from "../../layout/element-writer.page";
import {
	createRoundedCornerPath,
	createRoundedRectanglePath,
	type CornerRadii,
	type RoundedCorner,
} from "../../layout/rounded-geometry";
import { trackVectorInsertion } from "../../layout/vector-insertion";
import type { Color } from "../../types";
import type { PageBreak, PdfPage, Vector, VectorPageItem } from "../../types/internal";
import { isNumber } from "../../utils/variable-type";
import { layoutStack } from "./layout-stack";
import type { LayoutStackNode, StackDecoration } from "./stack.types";

/** Outer box of a decorated stack, in coordinates relative to its left edge. */
type Frame = {
	borderWidth: number;
	radius: number;
	borderColor: Color;
	backgroundColor?: Color | undefined;
	/** Left edge of the right border. */
	right: number;
};

type EdgeOptions = {
	/** Absolute y of the edge; the current cursor y when omitted. */
	overrideY?: number | undefined;
	forcePage?: number | undefined;
	/** Draws the straight part of the edge; the rounded corners are drawn either way. */
	straight?: boolean | undefined;
	moveDown?: boolean | undefined;
};

type PlacedLine = { page: PdfPage; item: VectorPageItem };

/**
 * Draws the top or bottom edge of a frame fragment: a straight border shortened by the corner
 * radius, and its two rounded corners. Returns the straight border, once placed on its page.
 */
function drawEdge(
	writer: PageElementWriter,
	frame: Frame,
	edge: "top" | "bottom",
	{ overrideY, forcePage, straight = true, moveDown = false }: EdgeOptions,
): { line?: PlacedLine | undefined } {
	const lineWidth = frame.borderWidth;
	const placed: { line?: PlacedLine | undefined } = {};
	if (!lineWidth) return placed;

	const radius = frame.radius;
	const leftCenter = lineWidth / 2;
	const rightCenter = frame.right + lineWidth / 2;
	const y = (overrideY || 0) + lineWidth / 2;
	const ignoreContextY = isNumber(overrideY);

	if (straight) {
		const x1 = radius > 0 ? leftCenter + radius : 0;
		const x2 = radius > 0 ? rightCenter - radius : frame.right;
		if (x2 > x1) {
			const vector: Vector = {
				type: "line",
				x1,
				x2,
				y1: y,
				y2: y,
				lineWidth,
				dash: undefined,
				lineColor: frame.borderColor,
			};
			trackVectorInsertion(vector, (_pageIndex, page, item) => {
				placed.line ??= { page, item };
			});
			writer.addVector(vector, false, ignoreContextY, undefined, forcePage);
		}
	}

	if (radius > 0) {
		const cornerY = edge === "top" ? y : y - radius;
		const corners: Array<[RoundedCorner, number]> =
			edge === "top"
				? [
						["topLeft", leftCenter],
						["topRight", rightCenter - radius],
					]
				: [
						["bottomLeft", leftCenter],
						["bottomRight", rightCenter - radius],
					];
		for (const [corner, x] of corners) {
			writer.addVector(
				{
					type: "path",
					x,
					y: cornerY,
					d: createRoundedCornerPath(corner, radius),
					lineWidth,
					lineColor: frame.borderColor,
					dash: undefined,
					lineJoin: "round",
				},
				false,
				ignoreContextY,
				undefined,
				forcePage,
			);
		}
	}

	if (moveDown) writer.context().moveDown(lineWidth);
	return placed;
}

/**
 * Draws the side borders and the background of one page fragment, between `y1` and `y2`.
 * `topOffset` is the height of the top border drawn above `y1` (none on a continuation).
 */
function drawFragment(
	writer: PageElementWriter,
	frame: Frame,
	y1: number,
	y2: number,
	topOffset: number,
	roundTop: boolean,
): void {
	const { borderWidth, radius } = frame;
	const trimTop = roundTop && borderWidth > 0 ? radius + borderWidth / 2 : 0;
	const trimBottom = borderWidth > 0 ? radius + borderWidth / 2 : 0;

	const drawSide = (x: number): void => {
		if (borderWidth === 0) return;
		const top = y1 - topOffset + trimTop;
		const bottom = y2 + borderWidth - trimBottom;
		if (bottom <= top) return;
		writer.addVector(
			{
				type: "line",
				x1: x + borderWidth / 2,
				x2: x + borderWidth / 2,
				y1: top,
				y2: bottom,
				lineWidth: borderWidth,
				dash: undefined,
				lineColor: frame.borderColor,
			},
			false,
			true,
		);
	};

	drawSide(0);

	if (frame.backgroundColor) {
		// Fills extend half a point beyond the border centers so that no gap shows against them.
		const x1 = borderWidth / 2;
		const fillY1 = y1 - topOffset / 2;
		const x2 = frame.right + borderWidth / 2;
		const fillY2 = y2 + borderWidth / 2;
		const rectangle = {
			type: "rect" as const,
			x: x1,
			y: fillY1 - 0.5,
			w: x2 - x1,
			h: fillY2 - fillY1 + 0.5 * 2,
			lineWidth: 0,
		};
		const topRadius = roundTop ? radius : 0;
		const cornerRadii: CornerRadii = [topRadius, topRadius, radius, radius];
		const shape = cornerRadii.some((value) => value > 0)
			? {
					type: "path" as const,
					x: rectangle.x,
					y: rectangle.y,
					d: createRoundedRectanglePath(rectangle.w, rectangle.h, cornerRadii),
					lineWidth: 0,
				}
			: rectangle;
		writer.addVectorBehindContent(
			{ ...shape, color: frame.backgroundColor, fillOpacity: 1 },
			false,
			true,
		);
	}

	drawSide(frame.right);
}

/** Removes a placed straight border that lies within its own width of `y`. */
function removeLineNear(line: PlacedLine | undefined, page: PdfPage | undefined, y: number): void {
	if (!line || line.page !== page) return;
	const vector = line.item.item;
	if (vector.type !== "line" || Math.abs((vector.y1 ?? 0) - y) > (vector.lineWidth ?? 1) + 1) {
		return;
	}
	const index = page.items.indexOf(line.item);
	if (index !== -1) page.items.splice(index, 1);
}

/**
 * Lays out a decorated stack: its items in a content box inset by the border and the padding,
 * framed by a background and a border, optionally rounded. A frame broken across pages is drawn
 * as one fragment per page; each fragment has its own top and bottom border and rounded corners.
 * A frame whose first page would hold only its top padding starts on the next page.
 */
export function layoutDecoratedStack(
	node: LayoutStackNode,
	decoration: StackDecoration,
	context: NodeLayoutContext,
): void {
	const writer = context.writer;
	const firstItem = node.stack[0];
	// A leading section establishes the page before the frame is measured against it.
	if (firstItem && !writer.context().getCurrentPage()) context.preparePage(firstItem);

	const nestedLevel = ++context.nestedLevel;
	const { borderWidth } = decoration;
	const [paddingLeft, paddingTop, paddingRight, paddingBottom] = decoration.padding;

	// Width of the content box: the available width less borders and padding, never negative.
	const insetWidth = borderWidth + paddingLeft + (paddingRight + borderWidth);
	const available = writer.context().availableWidth - insetWidth;
	const contentMinWidth = node._contentMinWidth ?? 0;
	const contentWidth =
		contentMinWidth >= available
			? contentMinWidth > 0
				? contentMinWidth * (Math.max(0, available) / contentMinWidth)
				: 0
			: available;
	const right = paddingLeft + paddingRight + borderWidth + contentWidth;
	const frame: Frame = {
		borderWidth,
		radius: Math.min(
			Number.isFinite(decoration.borderRadius) ? Math.max(0, decoration.borderRadius) : 0,
			(insetWidth + contentWidth) / 2,
		),
		borderColor: decoration.borderColor,
		backgroundColor: decoration.backgroundColor,
		right,
	};

	// The top border and padding are reserved at the start of the frame and of every page it
	// continues on; the bottom border and padding are kept free at the bottom of every page.
	const startContext = writer.context();
	const startPage = startContext.getCurrentPage();
	const xOffset =
		startContext.x - (startPage?.pageMargins.left ?? startContext.pageMargins?.left ?? 0);
	const reservedAtBottom = borderWidth + paddingBottom;
	const reserveOnNewPage = (): void => {
		writer.context().availableHeight -= reservedAtBottom;
		writer.context().moveDown(paddingTop + borderWidth);
	};
	writer.addListener("pageChanged", reserveOnNewPage);
	const topBorderY = writer.context().y;
	writer.context().moveDown(borderWidth);
	const contentTopY = writer.context().y;
	writer.context().availableHeight -= reservedAtBottom;
	writer.context().moveDown(paddingTop);

	const marginX: [number, number] | null =
		nestedLevel === 1 ? (node._margin ? [node._margin[0], node._margin[2]] : [0, 0]) : null;
	writer.context().beginColumnGroup(marginX);

	// Page breaks inside the content, merged per page: the lowest end and the highest restart.
	const breaks: PageBreak[] = [];
	const recordBreak = (change: PageBreak): void => {
		const known = breaks.find((pageBreak) => pageBreak.prevPage === change.prevPage);
		if (known) {
			known.prevY = Math.max(known.prevY, change.prevY);
			known.y = Math.min(known.y, change.y);
		} else {
			breaks.push({ prevPage: change.prevPage, prevY: change.prevY, y: change.y });
		}
	};
	writer.addListener("pageChanged", recordBreak);
	writer
		.context()
		.beginColumn(
			Math.max(0, right - 0 - borderWidth - paddingLeft - paddingRight),
			borderWidth + paddingLeft,
		);

	layoutStack(node, {
		processNode: (item) => context.processNode(item),
		moveDownWithPageBreak: context.moveDownWithPageBreak,
	});

	writer.context().updateBottomByPage();
	writer.removeListener("pageChanged", recordBreak);
	const bottomByPage = writer.context().completeColumnGroup(0);
	for (const [page, bottom] of Object.entries(bottomByPage)) {
		const pageBreak = breaks.find((candidate) => candidate.prevPage === Number(page));
		if (pageBreak) pageBreak.prevY = Math.max(pageBreak.prevY, bottom);
	}

	writer.removeListener("pageChanged", reserveOnNewPage);
	writer.context().moveDown(paddingBottom);
	writer.context().availableHeight += reservedAtBottom;

	const ending = writer.context();
	const endingPage = ending.page;
	const endingY = ending.y;
	const endingAvailableHeight = ending.availableHeight;
	const endingX = ending.x;
	const endingAvailableWidth = ending.availableWidth;

	// One fragment per page, from the content top (or the restart after a break) to its end.
	type Fragment = { y0: number; y1: number; page: number };
	const [firstBreak] = breaks;
	const fragments: Fragment[] = [];
	let fragmentStart = { y0: contentTopY, page: firstBreak ? firstBreak.prevPage : endingPage };
	for (const pageBreak of breaks) {
		fragments.push({ ...fragmentStart, y1: pageBreak.prevY });
		fragmentStart = { y0: pageBreak.y, page: pageBreak.prevPage + 1 };
	}
	fragments.push({ ...fragmentStart, y1: endingY });

	const [firstFragment] = fragments;
	const skipFirstFragment =
		firstFragment !== undefined && firstFragment.y1 - firstFragment.y0 === paddingTop;
	if (skipFirstFragment && firstBreak) {
		// Only the top padding fit on the first page: the frame starts on the next page.
		drawEdge(writer, frame, "bottom", {
			overrideY: firstBreak.prevY,
			forcePage: firstBreak.prevPage,
			straight: false,
		});
	}
	const topBorder = skipFirstFragment
		? {}
		: drawEdge(writer, frame, "top", { overrideY: topBorderY, forcePage: firstBreak?.prevPage });

	const firstDrawn = skipFirstFragment ? 1 : 0;
	for (const [index, fragment] of fragments.entries()) {
		if (index < firstDrawn) continue;
		const willBreak = index < fragments.length - 1;
		const isContinuation = index > 0;
		const topOffset = isContinuation ? 0 : borderWidth;
		const y1 = fragment.y0;
		const y2 = willBreak ? fragment.y1 + paddingBottom : fragment.y1;

		const fragmentContext = writer.context();
		if (fragmentContext.page != fragment.page) fragmentContext.page = fragment.page;
		const fragmentPage = fragmentContext.getCurrentPage();
		if (fragmentPage) {
			fragmentContext.pageMargins = fragmentPage.pageMargins;
			fragmentContext.x = fragmentPage.pageMargins.left + xOffset;
			fragmentContext.availableWidth =
				fragmentPage.pageSize.width - fragmentContext.x - fragmentPage.pageMargins.right;
		}

		if (willBreak) {
			if (index === 0 && frame.radius > 0) {
				// A first fragment no taller than its border loses its straight top border.
				removeLineNear(topBorder.line, fragmentPage, y2 + borderWidth / 2);
			}
			drawEdge(writer, frame, "bottom", { overrideY: y2 });
		}
		if (isContinuation) drawEdge(writer, frame, "top", { overrideY: y1 });

		// A continuation is rounded at its top when its own top border is rounded.
		const roundTop = index === firstDrawn || (frame.radius > 0 && borderWidth > 0);
		drawFragment(writer, frame, y1, y2, topOffset, roundTop);
	}

	const restored = writer.context();
	restored.page = endingPage;
	restored.y = endingY;
	restored.availableHeight = endingAvailableHeight;
	restored.x = endingX;
	restored.availableWidth = endingAvailableWidth;
	const restoredPage = restored.getCurrentPage();
	if (restoredPage) restored.pageMargins = restoredPage.pageMargins;

	drawEdge(writer, frame, "bottom", { moveDown: true });

	if (--context.nestedLevel === 0) writer.context().resetMarginXTopParent();
}
