import TextDecorator from "../text/text-decorator";
import TextInlines from "../text/text-inlines";
import type { Inline, LayoutPdfNode, LineLike, MeasuredPdfNode } from "../types/internal";
import { isNumber } from "../utils/variable-type";
import RendererGraphics from "./renderer.graphics";
import { offsetText } from "./renderer.helpers";
import type PDFDocument from "./pdf-document";
import type {
	ClipRectangle,
	EmbeddedFont,
	PageNodeReference,
	RenderablePage,
	RendererTextOptions,
	VerticalAlignmentItem,
} from "./renderer.types";

const collectFormStrings = (value: unknown, strings: string[]): void => {
	if (typeof value === "string") {
		strings.push(value);
	} else if (Array.isArray(value)) {
		for (const item of value) collectFormStrings(item, strings);
	}
};

class Renderer {
	private readonly pdfDocument: PDFDocument;
	private readonly graphics: RendererGraphics;
	private readonly progressCallback: ((progress: number) => void) | undefined;
	private readonly outlineMap: Record<string, PDFKit.PDFOutline> = {};
	private formInitialized = false;

	constructor(pdfDocument: PDFDocument, progressCallback?: (progress: number) => void) {
		this.pdfDocument = pdfDocument;
		this.graphics = new RendererGraphics(pdfDocument);
		this.progressCallback = progressCallback;
	}

	renderPages(pages: RenderablePage[]): void {
		this.pdfDocument._pdfCraftPages = pages;

		const totalItems = this.progressCallback
			? pages.reduce((total, page) => total + page.items.length, 0)
			: 0;
		let renderedItems = 0;

		for (const page of pages) {
			this.pdfDocument.addPage({ size: [page.pageSize.width, page.pageSize.height] });
			this.graphics.beginPage();

			for (const item of page.items) {
				if (item.type !== "vector") {
					this.graphics.prepareNonVectorItem();
				}

				switch (item.type) {
					case "vector":
						this.graphics.renderVector(item.item);
						break;
					case "line":
						this.renderLine(item.item, item.item.x ?? 0, item.item.y ?? 0);
						break;
					case "image":
						this.graphics.renderImage(item.item);
						break;
					case "svg":
						this.graphics.renderSVG(item.item);
						break;
					case "attachment":
						this.graphics.renderAttachment(item.item);
						break;
					case "acroform":
						this.renderAcroForm(item.item, item.item.x ?? 0, item.item.y ?? 0);
						break;
					case "beginClip":
						this.graphics.beginClip(item.item as ClipRectangle);
						break;
					case "endClip":
						this.graphics.endClip();
						break;
					case "beginVerticalAlignment":
						this.graphics.beginVerticalAlignment(item.item as VerticalAlignmentItem);
						break;
					case "endVerticalAlignment":
						this.graphics.endVerticalAlignment(item.item as VerticalAlignmentItem);
						break;
				}

				renderedItems++;
				this.progressCallback?.(renderedItems / totalItems);
			}

			this.graphics.endPage();

			if (page.watermark) {
				this.graphics.renderWatermark(page);
			}
		}
	}

	renderLine(line: LineLike, x: number, y: number): void {
		const preparePageNodeRefLine = (
			pageNodeRef: PageNodeReference | MeasuredPdfNode | LayoutPdfNode,
			inline: Inline,
		): void => {
			const positions = "positions" in pageNodeRef ? pageNodeRef.positions : undefined;
			if (positions === undefined) {
				throw new Error("Page reference id not found");
			}

			const pageNumber = positions[0]?.pageNumber;
			if (pageNumber === undefined) {
				throw new Error("Page reference position not found");
			}
			inline.text = pageNumber.toString();
			const newWidth = new TextInlines(null).widthOfText(inline.text, inline);
			const diffWidth = inline.width - newWidth;
			inline.width = newWidth;

			if (inline.alignment === "right") {
				inline.x += diffWidth;
			} else if (inline.alignment === "center") {
				inline.x += diffWidth / 2;
			}
		};

		if (line._outline) {
			let parentOutline = this.pdfDocument.outline;
			if (line._outline.parentId && this.outlineMap[line._outline.parentId]) {
				parentOutline = this.outlineMap[line._outline.parentId];
			}

			const outline = parentOutline.addItem(line._outline.text, {
				expanded: line._outline.expanded,
			});
			if (line._outline.id) {
				this.outlineMap[line._outline.id] = outline;
			}
		}

		if (line._pageNodeRef) {
			preparePageNodeRefLine(line._pageNodeRef, line.inlines[0]);
		}

		x ||= 0;
		y ||= 0;
		const lineHeight = line.getHeight();
		const descent = lineHeight - line.getAscenderHeight();
		const textDecorator = new TextDecorator(this.pdfDocument);

		textDecorator.drawBackground(line, x, y);

		for (let index = 0; index < line.inlines.length; index++) {
			const inline = line.inlines[index];
			const shiftToBaseline =
				lineHeight - (inline.font.ascender / 1000) * inline.fontSize - descent;

			if (inline.acroform) {
				this.renderAcroForm(inline, x + inline.x, y + Math.max(0, lineHeight - inline.height));
				continue;
			}

			if (inline._pageNodeRef) {
				preparePageNodeRefLine(inline._pageNodeRef, inline);
			}

			const options: RendererTextOptions = {
				lineBreak: false,
				textWidth: inline.width,
				characterSpacing: inline.characterSpacing,
				wordCount: 1,
				link: inline.link,
			};
			if (inline.linkToDestination) options.goTo = inline.linkToDestination;
			if (line.id && index === 0) options.destination = line.id;
			if (inline.fontFeatures) {
				options.features = inline.fontFeatures as PDFKit.Mixins.OpenTypeFeatures[];
			}

			this.pdfDocument.opacity(isNumber(inline.opacity) ? inline.opacity : 1);
			this.pdfDocument.fill(this.pdfDocument.resolveColor(inline.color, "black"));
			this.pdfDocument._font = inline.font as EmbeddedFont;
			this.pdfDocument.fontSize(inline.fontSize);

			const shiftedY = inline.image !== undefined ? y : offsetText(y + shiftToBaseline, inline);
			if (inline.image !== undefined) {
				this.pdfDocument.image(inline.image as PDFKit.Mixins.ImageSrc, x + inline.x, shiftedY, {
					width: inline._imageWidth ?? inline.width,
					height: inline._imageHeight ?? inline.height,
				});
			} else {
				this.pdfDocument.text(inline.text, x + inline.x, shiftedY, options);
			}

			if (inline.linkToPage) {
				const action = this.pdfDocument.ref({
					Type: "Action",
					S: "GoTo",
					D: [inline.linkToPage, 0, 0],
				});
				(action.end as () => void)();
				this.pdfDocument.annotate(x + inline.x, shiftedY, inline.width, inline.height, {
					Subtype: "Link",
					Dest: [inline.linkToPage - 1, "XYZ", null, null, null],
				} as PDFKit.Mixins.AnnotationOption);
			}
		}

		textDecorator.drawDecorations(line, x, y);
	}

	private renderAcroForm(node: LayoutPdfNode | Inline, x: number, y: number): void {
		const form = node.acroform;
		if (!form) throw new Error("Cannot render an AcroForm node without a field definition");
		const font = "_formFont" in node ? (node._formFont ?? node.font) : node.font;
		if (!font) throw new Error(`AcroForm field '${form.id}' has no resolved font`);
		const embeddedFont = font as EmbeddedFont;
		this.pdfDocument._font = embeddedFont;
		if (!this.formInitialized) {
			this.pdfDocument.initForm();
			this.formInitialized = true;
		}

		const width = "_width" in node && node._width !== undefined ? node._width : node.width;
		const height = "_height" in node && node._height !== undefined ? node._height : node.height;
		const resolvedWidth = typeof width === "number" ? width : 25;
		const resolvedHeight = typeof height === "number" ? height : 15;
		const options = { ...(form.options ?? {}) };
		const formStrings: string[] = [];
		for (const key of ["value", "defaultValue", "label", "select", "Opt"] as const) {
			collectFormStrings(options[key], formStrings);
		}
		for (const value of formStrings) embeddedFont.encode?.(value);

		switch (form.type) {
			case "text":
				this.pdfDocument.formText(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
			case "button":
				this.pdfDocument.formPushButton(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
			case "list":
				this.pdfDocument.formList(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
			case "combo":
				this.pdfDocument.formCombo(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
			case "checkbox":
				this.pdfDocument.formCheckbox(form.id, x, y, resolvedWidth, resolvedHeight, options);
				break;
		}
	}
}

export default Renderer;
