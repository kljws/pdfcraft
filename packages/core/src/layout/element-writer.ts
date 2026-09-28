import { isNumber } from "../utils/variable-type";
import { offsetVector } from "../utils/tools";
import DocumentContext from "../document/document-context";
import type {
	CurrentPosition,
	LayoutPdfNode,
	LineLike,
	PageBreak,
	PageItem,
	Vector,
	VectorPageItem,
} from "../types/internal";
import { addPageItem, getAlignmentOffset } from "./element-writer.helpers";
import { type ElementFragment, replayFragment } from "./element-writer.fragments";
import { notifyVectorInsertion } from "./vector-insertion";
import type { NodePlaceResult } from "../engine/contracts/node-feature";

export type ElementWriterEvents = {
	lineAdded: [line: LineLike];
	pageChanged: [change: PageBreak];
	columnChanged: [change: { prevY: number; y: number }];
};

type ElementPlacementWriter = {
	context(): DocumentContext;
	getCurrentPositionOnPage(): CurrentPosition;
	addVector(
		vector: Vector,
		ignoreContextX?: boolean,
		ignoreContextY?: boolean,
		index?: number,
		forcePage?: number,
	): CurrentPosition | undefined;
};

export type ElementPlacementAdapter = {
	placeFeatureItem(
		featureKind: string,
		writer: ElementPlacementWriter,
		node: LayoutPdfNode,
		index?: number,
		allowOverflow?: boolean,
	): NodePlaceResult;
};

/**
 * A line/vector writer, which adds elements to current page and sets
 * their positions based on the context
 */
class ElementWriter {
	private _context: DocumentContext;
	readonly contextStack: DocumentContext[];
	private readonly onLineAdded?: ((line: LineLike) => void) | undefined;
	private readonly placement?: ElementPlacementAdapter | undefined;

	constructor(
		context: DocumentContext,
		onLineAdded?: (line: LineLike) => void,
		placement?: ElementPlacementAdapter,
	) {
		this._context = context;
		this.onLineAdded = onLineAdded;
		this.placement = placement;
		this.contextStack = [];
	}

	context(): DocumentContext {
		return this._context;
	}

	addFeatureItem(
		featureKind: "canvas",
		node: LayoutPdfNode,
		index?: number,
		allowOverflow?: boolean,
	): false | Array<CurrentPosition | undefined>;
	addFeatureItem(
		featureKind: string,
		node: LayoutPdfNode,
		index?: number,
		allowOverflow?: boolean,
	): CurrentPosition | false;
	addFeatureItem(
		featureKind: string,
		node: LayoutPdfNode,
		index?: number,
		allowOverflow = false,
	): NodePlaceResult {
		return this.getPlacement().placeFeatureItem(featureKind, this, node, index, allowOverflow);
	}

	private getPlacement(): ElementPlacementAdapter {
		if (!this.placement) {
			throw new Error("Element placement adapter is required for feature page items");
		}
		return this.placement;
	}

	addLine(
		line: LineLike,
		dontUpdateContextPosition?: boolean,
		index?: number,
		allowOverflow = false,
	): CurrentPosition | false {
		const height = line.getHeight();
		const context = this.context();
		const page = context.getCurrentPage();
		const position = this.getCurrentPositionOnPage();

		if (!page || (!allowOverflow && context.availableHeight < height)) {
			return false;
		}

		line.x = context.x + (line.x || 0);
		line.y = context.y + (line.y || 0);

		this.alignLine(line);

		addPageItem(
			page,
			{
				type: "line",
				item: line,
			},
			index,
		);
		this.onLineAdded?.(line);

		if (!dontUpdateContextPosition) {
			context.moveDown(height);
		}

		return position;
	}

	private alignLine(line: LineLike): void {
		const width = this.context().availableWidth;
		const lineWidth = line.getWidth();

		const alignment = line.inlines[0]?.alignment;

		let offset = getAlignmentOffset(alignment ?? undefined, width, lineWidth);
		if (offset) {
			line.x = (line.x || 0) + offset;
		}

		if (
			alignment === "justify" &&
			!line.newLineForced &&
			!line.lastLineInParagraph &&
			line.inlines.length > 1
		) {
			const additionalSpacing = (width - lineWidth) / (line.inlines.length - 1);

			for (const [i, inline] of line.inlines.entries()) {
				if (i === 0) continue;
				offset = i * additionalSpacing;

				inline.x += offset;
				inline.justifyShift = additionalSpacing;
			}
		}
	}

	addVector(
		vector: Vector,
		ignoreContextX?: boolean,
		ignoreContextY?: boolean,
		index?: number,
		forcePage?: number,
	): CurrentPosition | undefined {
		const context = this.context();
		let page = context.getCurrentPage();
		if (isNumber(forcePage)) {
			page = context.pages[forcePage];
		}
		const position = this.getCurrentPositionOnPage();

		if (page) {
			offsetVector(vector, ignoreContextX ? 0 : context.x, ignoreContextY ? 0 : context.y);
			const pageItem: VectorPageItem = {
				type: "vector",
				item: vector,
			};
			addPageItem(page, pageItem, index);
			notifyVectorInsertion(vector, isNumber(forcePage) ? forcePage : context.page, page, pageItem);
			return position;
		}
	}

	beginVerticalAlignment(verticalAlignment?: string): PageItem {
		const page = this.context().requireCurrentPage();
		const item: PageItem = {
			type: "beginVerticalAlignment",
			item: { verticalAlignment: verticalAlignment },
		};
		page.items.push(item);
		return item;
	}

	endVerticalAlignment(verticalAlignment?: string): PageItem {
		const page = this.context().requireCurrentPage();
		const item: PageItem = {
			type: "endVerticalAlignment",
			item: { verticalAlignment: verticalAlignment },
		};
		page.items.push(item);
		return item;
	}

	addFragment(
		block: ElementFragment,
		useBlockXOffset?: boolean,
		useBlockYOffset?: boolean,
		dontUpdateContextPosition?: boolean,
	): boolean {
		return replayFragment(this, block, useBlockXOffset, useBlockYOffset, dontUpdateContextPosition);
	}

	/**
	 * Pushes the provided context onto the stack or creates a new one
	 *
	 * pushContext(context) - pushes the provided context and makes it current
	 * pushContext(width, height) - creates and pushes a new context with the specified width and height
	 * pushContext() - creates a new context for unbreakable blocks (with current availableWidth and full-page-height)
	 *
	 * @param contextOrWidth
	 * @param height
	 */
	pushContext(contextOrWidth?: DocumentContext | number, height?: number): void {
		if (contextOrWidth === undefined) {
			height =
				this.context().requireCurrentPage().pageSize.height -
				this.context().pageMargins.top -
				this.context().pageMargins.bottom;
			contextOrWidth = this.context().availableWidth;
		}

		if (typeof contextOrWidth === "number") {
			const width = contextOrWidth;
			if (height === undefined) {
				throw new Error("A context height is required when creating a context from a width");
			}
			const context = new DocumentContext();
			context.addPage(
				{ width, height, orientation: width > height ? "landscape" : "portrait" },
				{ left: 0, right: 0, top: 0, bottom: 0 },
			);
			contextOrWidth = context;
		}
		if (contextOrWidth === undefined) {
			throw new Error("Unable to create an element-writer context");
		}

		this.contextStack.push(this.context());
		this._context = contextOrWidth;
	}

	popContext(): void {
		const context = this.contextStack.pop();
		if (context) this._context = context;
	}

	getCurrentPositionOnPage(): CurrentPosition {
		return (this.contextStack[0] || this.context()).getCurrentPosition();
	}
}

export default ElementWriter;
