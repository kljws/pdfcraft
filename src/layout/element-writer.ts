import { isNumber } from "../utils/variable-type";
import { pack, offsetVector } from "../utils/tools";
import DocumentContext from "../document/document-context";
import type {
	CurrentPosition,
	LayoutPdfNode,
	LineLike,
	PageBreak,
	PageItem,
	PdfPage,
	Position,
	Vector,
} from "../types/internal";
import { addPageItem, alignCanvas, alignImage, getAlignmentOffset } from "./element-writer.helpers";
import { addAttachment, addCanvas, addImage, addQr, addSVG } from "./element-writer.media";
import { addAcroForm } from "./element-writer.form";

type VectorPageItem = Extract<PageItem, { type: "vector" }>;
type VectorInsertionListener = (pageIndex: number, page: PdfPage, pageItem: VectorPageItem) => void;

const vectorInsertionListener = Symbol("vectorInsertionListener");
type TrackedVector = Vector & {
	[vectorInsertionListener]?: VectorInsertionListener;
};

export const trackVectorInsertion = (vector: Vector, listener: VectorInsertionListener): void => {
	Object.defineProperty(vector, vectorInsertionListener, {
		value: listener,
		enumerable: true,
		configurable: true,
	});
};

const notifyVectorInsertion = (
	vector: Vector,
	pageIndex: number,
	page: PdfPage,
	pageItem: VectorPageItem,
): void => {
	(vector as TrackedVector)[vectorInsertionListener]?.(pageIndex, page, pageItem);
};

export interface ElementWriterEvents {
	lineAdded: [line: LineLike];
	pageChanged: [change: PageBreak];
	columnChanged: [change: { prevY: number; y: number }];
}

/**
 * A line/vector writer, which adds elements to current page and sets
 * their positions based on the context
 */
class ElementWriter {
	_context: DocumentContext;
	contextStack: DocumentContext[];
	private readonly onLineAdded?: (line: LineLike) => void;

	constructor(context: DocumentContext, onLineAdded?: (line: LineLike) => void) {
		this._context = context;
		this.onLineAdded = onLineAdded;
		this.contextStack = [];
	}

	context(): DocumentContext {
		return this._context;
	}

	addImage(image: LayoutPdfNode, index?: number): CurrentPosition | false {
		return addImage(this, image, index);
	}

	addCanvas(node: LayoutPdfNode, index?: number): false | Array<CurrentPosition | undefined> {
		return addCanvas(this, node, index);
	}

	addSVG(image: LayoutPdfNode, index?: number): CurrentPosition | false {
		return addSVG(this, image, index);
	}

	addQr(qr: LayoutPdfNode, index?: number): CurrentPosition | false {
		return addQr(this, qr, index);
	}

	addAttachment(attachment: LayoutPdfNode, index?: number): CurrentPosition | false {
		return addAttachment(this, attachment, index);
	}

	addAcroForm(node: LayoutPdfNode, index?: number): CurrentPosition | false {
		return addAcroForm(this, node, index);
	}

	alignImage(image: LayoutPdfNode): void {
		alignImage(image, this.context().availableWidth);
	}

	alignCanvas(node: LayoutPdfNode): void {
		alignCanvas(node, this.context().availableWidth);
	}

	addLine(
		line: LineLike,
		dontUpdateContextPosition?: boolean,
		index?: number,
	): CurrentPosition | false {
		let height = line.getHeight();
		let context = this.context();
		let page = context.getCurrentPage();
		let position = this.getCurrentPositionOnPage();

		if (context.availableHeight < height || !page) {
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

	alignLine(line: LineLike): void {
		let width = this.context().availableWidth;
		let lineWidth = line.getWidth();

		const alignment = line.inlines.length > 0 ? line.inlines[0].alignment : undefined;

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
			let additionalSpacing = (width - lineWidth) / (line.inlines.length - 1);

			for (let i = 1, l = line.inlines.length; i < l; i++) {
				offset = i * additionalSpacing;

				line.inlines[i].x += offset;
				line.inlines[i].justifyShift = additionalSpacing;
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
		let context = this.context();
		let page = context.getCurrentPage();
		if (isNumber(forcePage)) {
			page = context.pages[forcePage];
		}
		let position = this.getCurrentPositionOnPage();

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

	beginClip(width: number, height: number): boolean {
		let ctx = this.context();
		let page = ctx.getCurrentPage();
		page.items.push({
			type: "beginClip",
			item: { x: ctx.x, y: ctx.y, width: width, height: height },
		});
		return true;
	}

	endClip(): boolean {
		let ctx = this.context();
		let page = ctx.getCurrentPage();
		page.items.push({
			type: "endClip",
		});
		return true;
	}

	beginVerticalAlignment(verticalAlignment?: string): PageItem {
		let page = this.context().getCurrentPage();
		const item: PageItem = {
			type: "beginVerticalAlignment",
			item: { verticalAlignment: verticalAlignment },
		};
		page.items.push(item);
		return item;
	}

	endVerticalAlignment(verticalAlignment?: string): PageItem {
		let page = this.context().getCurrentPage();
		const item: PageItem = {
			type: "endVerticalAlignment",
			item: { verticalAlignment: verticalAlignment },
		};
		page.items.push(item);
		return item;
	}

	addFragment(
		block: {
			height: number;
			xOffset?: number;
			yOffset?: number;
			items: PageItem[];
		},
		useBlockXOffset?: boolean,
		useBlockYOffset?: boolean,
		dontUpdateContextPosition?: boolean,
	): boolean {
		let ctx = this.context();
		let page = ctx.getCurrentPage();

		if (!useBlockXOffset && block.height > ctx.availableHeight) {
			return false;
		}

		block.items.forEach((item) => {
			switch (item.type) {
				case "line":
					var l = (item.item as LineLike).clone();

					updateNodePageNumbers(l, ctx.page + 1);
					l.x = (l.x || 0) + (useBlockXOffset ? block.xOffset || 0 : ctx.x);
					l.y = (l.y || 0) + (useBlockYOffset ? block.yOffset || 0 : ctx.y);

					page.items.push({
						type: "line",
						item: l,
					});
					break;

				case "vector": {
					const v = pack(item.item as Vector) as Vector & {
						_isFillColorFromUnbreakable?: boolean;
					};
					updateNodePageNumbers(v, ctx.page + 1);

					offsetVector(
						v,
						useBlockXOffset ? block.xOffset || 0 : ctx.x,
						useBlockYOffset ? block.yOffset || 0 : ctx.y,
					);
					const pageItem: VectorPageItem = {
						type: "vector",
						item: v,
					};
					if (v._isFillColorFromUnbreakable) {
						// If the item is a fillColor from an unbreakable block
						// We have to add it at the beginning of the items body array of the page
						delete v._isFillColorFromUnbreakable;
						const endOfBackgroundItemsIndex = ctx.backgroundLength[ctx.page];
						page.items.splice(endOfBackgroundItemsIndex, 0, pageItem);
					} else {
						page.items.push(pageItem);
					}
					notifyVectorInsertion(v, ctx.page, page, pageItem);
					break;
				}

				case "image":
				case "svg":
				case "attachment":
				case "acroform": {
					const image = pack(item.item) as LayoutPdfNode;
					updateNodePageNumbers(image, ctx.page + 1);

					image.x = (image.x || 0) + (useBlockXOffset ? block.xOffset || 0 : ctx.x);
					image.y = (image.y || 0) + (useBlockYOffset ? block.yOffset || 0 : ctx.y);

					page.items.push({ type: item.type, item: image });
					break;
				}
				case "beginClip":
				case "beginVerticalAlignment":
				case "endVerticalAlignment": {
					const control = { ...item.item };
					control.x = (control.x || 0) + (useBlockXOffset ? block.xOffset || 0 : ctx.x);
					control.y = (control.y || 0) + (useBlockYOffset ? block.yOffset || 0 : ctx.y);
					page.items.push({ type: item.type, item: control });
					break;
				}
				case "endClip":
					page.items.push(item);
					break;
			}
		});

		if (!dontUpdateContextPosition) {
			ctx.moveDown(block.height);
		}

		return true;
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
				this.context().getCurrentPage().pageSize.height -
				this.context().pageMargins.top -
				this.context().pageMargins.bottom;
			contextOrWidth = this.context().availableWidth;
		}

		if (typeof contextOrWidth === "number") {
			let width = contextOrWidth;
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

function updateNodePageNumbers(
	item: { _node?: LayoutPdfNode; _position?: Position },
	pageNumber: number,
): void {
	if (item._position) {
		item._position.pageNumber = pageNumber;
		return;
	}

	// Compatibility for fragments created outside LayoutBuilder, where only a
	// single position was historically associated with the rendered item.
	if (item._node?.positions?.length === 1) {
		item._node.positions[0].pageNumber = pageNumber;
	}
}

export default ElementWriter;
