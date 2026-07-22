import TextInlines from "../text/text-inlines";
import StyleContextStack from "../layout/style-context-stack";
import ColumnCalculator from "../layout/column-calculator";
import { isNumber, isObject } from "../utils/variable-type";
import { stringifyNode, getNodeId, getNodeMargin } from "../utils/node";
import qrEncoder from "../vendor/qr/qr-encoder";
import type { Alignment, Color, Dictionary, Style } from "../types";
import type { MeasuredPdfNode, PreprocessedPdfNode, TableLayout } from "../types/internal";
import type { TextFragment } from "../text/text.types";
import type PDFDocument from "../rendering/pdf-document";
import type SVGMeasure from "./svg-measure";
import {
	extendTableWidths,
	extendWidthsForColumnSpans,
	getTableOffsets,
	markColumnSpans,
	markRowSpans,
	resolveTableLayout,
} from "./doc-measure.table";
import DocMeasureContainers from "./doc-measure.containers";
import DocMeasureMedia from "./doc-measure.media";

class DocMeasure {
	readonly pdfDocument: PDFDocument;
	readonly textInlines: TextInlines;
	readonly styleStack: StyleContextStack;
	readonly svgMeasure: SVGMeasure;
	readonly tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>;
	protected readonly containers: DocMeasureContainers;
	protected readonly media: DocMeasureMedia;

	constructor(
		pdfDocument: PDFDocument,
		styleDictionary: Dictionary<Style>,
		defaultStyle: Style,
		svgMeasure: SVGMeasure,
		tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>> = {},
	) {
		this.pdfDocument = pdfDocument;
		this.styleStack = new StyleContextStack(styleDictionary, defaultStyle);
		this.svgMeasure = svgMeasure;
		this.tableLayouts = tableLayouts;
		this.media = new DocMeasureMedia(this.pdfDocument, this.styleStack, this.svgMeasure);
		this.textInlines = new TextInlines(pdfDocument, (node) => this.media.measureImage(node));
		this.containers = new DocMeasureContainers(this.textInlines, this.styleStack, (node) =>
			this.measureNode(node),
		);
	}

	/**
	 * Measures all nodes and sets min/max-width properties required for the second
	 * layout-pass.
	 *
	 * @param docStructure document-definition-object
	 * @returns document-measurement-object
	 */
	measureDocument(docStructure: PreprocessedPdfNode): MeasuredPdfNode {
		return this.measureNode(docStructure);
	}

	measureBlock(node: PreprocessedPdfNode): MeasuredPdfNode {
		return this.measureNode(node);
	}

	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode {
		const measuredNode = node as MeasuredPdfNode;
		return this.styleStack.auto(measuredNode, () => {
			measuredNode._margin = getNodeMargin(measuredNode, this.styleStack);
			const paragraphGap = this.styleStack.getProperty("paragraphGap");
			measuredNode._paragraphGap = typeof paragraphGap === "number" ? Math.max(0, paragraphGap) : 0;

			if (measuredNode.section) {
				return extendMargins(this.containers.measureSection(measuredNode));
			} else if (measuredNode.columns) {
				return extendMargins(this.containers.measureColumns(measuredNode));
			} else if (measuredNode.stack) {
				return extendMargins(this.containers.measureVerticalContainer(measuredNode));
			} else if (measuredNode.ul) {
				return extendMargins(this.containers.measureUnorderedList(measuredNode));
			} else if (measuredNode.ol) {
				return extendMargins(this.containers.measureOrderedList(measuredNode));
			} else if (measuredNode.table) {
				return extendMargins(this.measureTable(measuredNode));
			} else if (measuredNode.text !== undefined) {
				return extendMargins(this.measureLeaf(measuredNode));
			} else if (measuredNode.toc) {
				return extendMargins(this.measureToc(measuredNode));
			} else if (measuredNode.image) {
				return extendMargins(this.media.measureImage(measuredNode));
			} else if (measuredNode.svg) {
				return extendMargins(this.media.measureSVG(measuredNode));
			} else if (measuredNode.canvas) {
				return extendMargins(this.measureCanvas(measuredNode));
			} else if (measuredNode.qr) {
				return extendMargins(this.measureQr(measuredNode));
			} else if (measuredNode.attachment) {
				return extendMargins(this.measureAttachment(measuredNode));
			} else if (measuredNode.acroform) {
				return extendMargins(this.measureAcroForm(measuredNode));
			} else {
				throw new Error(`Unrecognized document structure: ${stringifyNode(measuredNode)}`);
			}
		});

		function extendMargins(node: MeasuredPdfNode): MeasuredPdfNode {
			let margin = node._margin;

			if (margin) {
				node._minWidth = (node._minWidth ?? 0) + margin[0] + margin[2];
				node._maxWidth = (node._maxWidth ?? 0) + margin[0] + margin[2];
			}

			return node;
		}
	}

	measureAcroForm(node: MeasuredPdfNode): MeasuredPdfNode {
		const width = typeof node.width === "number" ? node.width : 10;
		const height = typeof node.height === "number" ? node.height : 15;
		node._minWidth = width;
		node._maxWidth = width;
		node._minHeight = height;
		node._maxHeight = height;
		const font = this.styleStack.getProperty("font");
		const bold = this.styleStack.getProperty("bold");
		const italics = this.styleStack.getProperty("italics");
		node._formFont = this.pdfDocument.provideFont(
			typeof font === "string" ? font : "Roboto",
			bold === true,
			italics === true,
		);
		return node;
	}

	measureLeaf(node: MeasuredPdfNode): MeasuredPdfNode {
		if (node._textRef?._textNodeRef?.text) {
			node.text = node._textRef._textNodeRef.text;
		}

		// Make sure style properties of the node itself are considered when building inlines.
		// We could also just pass [node] to buildInlines, but that fails for bullet points.
		let styleStack = this.styleStack.clone();
		styleStack.push(node);

		const data = this.textInlines.buildInlines(
			node.text as TextFragment | TextFragment[],
			styleStack,
		);

		node._inlines = data.items;
		node._minWidth = data.minWidth;
		node._maxWidth = data.maxWidth;

		return node;
	}

	measureToc(node: MeasuredPdfNode): MeasuredPdfNode {
		const toc = node.toc!;
		if (toc.title) {
			toc.title = this.measureNode(toc.title);
		}

		if (toc._items.length > 0) {
			const body: PreprocessedPdfNode[][] = [];
			const textStyle = toc.textStyle || {};
			const numberStyle = toc.numberStyle || textStyle;
			const textMargin: [number, number, number, number] =
				Array.isArray(toc.textMargin) && toc.textMargin.length === 4
					? (toc.textMargin as [number, number, number, number])
					: [0, 0, 0, 0];

			if (toc.sortBy === "title") {
				toc._items.sort((a, b) => {
					return String(a._textNodeRef?.text).localeCompare(
						String(b._textNodeRef?.text),
						toc.sortLocale,
					);
				});
			}

			for (const item of toc._items) {
				const textNode = item._textNodeRef!;
				const lineStyle = textNode.tocStyle || textStyle;
				const lineMargin =
					Array.isArray(textNode.tocMargin) && textNode.tocMargin.length === 4
						? textNode.tocMargin
						: textMargin;
				const lineNumberStyle = textNode.tocNumberStyle || numberStyle;
				const destination = getNodeId(item._nodeRef) ?? undefined;
				body.push([
					{
						text: textNode.text,
						linkToDestination: destination,
						alignment: "left",
						style: lineStyle,
						margin: lineMargin,
					},
					{
						text: "00000",
						linkToDestination: destination,
						alignment: "right",
						_tocItemRef: item._nodeRef,
						style: lineNumberStyle,
						margin: [0, lineMargin[1], 0, lineMargin[3]],
					},
				]);

				if (toc.outlines) {
					textNode.outline = textNode.outline || true;
				}
			}

			const tocTable: PreprocessedPdfNode = {
				table: {
					dontBreakRows: true,
					widths: ["*", "auto"],
					body: body,
				},
				layout: "noBorders",
			};

			toc._table = this.measureNode(tocTable);
		}

		return node;
	}

	measureTable(node: MeasuredPdfNode): MeasuredPdfNode {
		extendTableWidths(node);
		const table = node.table!;
		const tableAlignment = this.styleStack.getProperty("tableAlignment");
		node._tableAlignment =
			tableAlignment === "center" || tableAlignment === "right" ? tableAlignment : "left";
		node._layout = resolveTableLayout(node, this.tableLayouts);
		node._offsets = getTableOffsets(node, node._layout);

		const colSpans: Array<{ col: number; span: number; minWidth: number; maxWidth: number }> = [];
		let col;
		let row;
		let cols;
		let rows;

		for (col = 0, cols = table.body[0].length; col < cols; col++) {
			let c = table.widths[col];
			c._minWidth = 0;
			c._maxWidth = 0;

			for (row = 0, rows = table.body.length; row < rows; row++) {
				let rowData = table.body[row];
				let data = rowData[col];
				if (data === undefined) {
					throw new Error(
						`Malformed table row, a cell is undefined.\nRow index: ${row}\nColumn index: ${col}\nRow data: ${stringifyNode(rowData)}`,
					);
				}
				if (!data._span) {
					data = rowData[col] = this.styleStack.auto(data, measureCb(this, data));

					if (data.colSpan && data.colSpan > 1) {
						markColumnSpans(rowData, col, data.colSpan);
						colSpans.push({
							col: col,
							span: data.colSpan,
							minWidth: data._minWidth ?? 0,
							maxWidth: data._maxWidth ?? 0,
						});
					} else {
						c._minWidth = Math.max(c._minWidth, data._minWidth ?? 0);
						c._maxWidth = Math.max(c._maxWidth, data._maxWidth ?? 0);
					}
				}

				if (data.rowSpan && data.rowSpan > 1) {
					markRowSpans(table, row, col, data.rowSpan);
				}
			}
		}

		extendWidthsForColumnSpans(node, colSpans);

		let measures = ColumnCalculator.measureMinMax(table.widths);

		node._minWidth = measures.min + node._offsets.total;
		node._maxWidth = measures.max + node._offsets.total;

		return node;

		function measureCb(_this: DocMeasure, data: MeasuredPdfNode): () => MeasuredPdfNode {
			return () => {
				if (isObject(data)) {
					data.border = _this.styleStack.getProperty("border") as
						[boolean, boolean, boolean, boolean] | undefined;
					data.borderColor = _this.styleStack.getProperty("borderColor") as
						[Color, Color, Color, Color] | undefined;
					data.fillColor = _this.styleStack.getProperty("fillColor") as Color | undefined;
					const fillOpacity = _this.styleStack.getProperty("fillOpacity");
					data.fillOpacity = typeof fillOpacity === "number" ? fillOpacity : undefined;
				}
				return _this.measureNode(data);
			};
		}
	}

	measureCanvas(node: MeasuredPdfNode): MeasuredPdfNode {
		let w = 0;
		let h = 0;

		for (const vector of node.canvas!) {
			switch (vector.type) {
				case "ellipse":
					w = Math.max(w, (vector.x ?? 0) + (vector.r1 ?? 0));
					h = Math.max(h, (vector.y ?? 0) + (vector.r2 ?? 0));
					break;
				case "rect":
					w = Math.max(w, (vector.x ?? 0) + (vector.w ?? 0));
					h = Math.max(h, (vector.y ?? 0) + (vector.h ?? 0));
					break;
				case "line":
					w = Math.max(w, vector.x1 ?? 0, vector.x2 ?? 0);
					h = Math.max(h, vector.y1 ?? 0, vector.y2 ?? 0);
					break;
				case "polyline":
					for (const point of vector.points ?? []) {
						w = Math.max(w, point.x);
						h = Math.max(h, point.y);
					}
					break;
			}
		}

		node._minWidth = node._maxWidth = w;
		node._minHeight = node._maxHeight = h;
		node._alignment = this.styleStack.getProperty("alignment") as Alignment | undefined;

		return node;
	}

	measureQr(node: MeasuredPdfNode): MeasuredPdfNode {
		const measuredQr = qrEncoder.measure({
			qr: node.qr,
			background: typeof node.background === "string" ? node.background : undefined,
			foreground: typeof node.foreground === "string" ? node.foreground : undefined,
			fit: typeof node.fit === "number" ? node.fit : undefined,
			eccLevel: node.eccLevel,
			mode: node.mode,
			version: node.version,
			mask: node.mask,
			padding: node.padding,
		});
		Object.assign(node, measuredQr);
		node._alignment = this.styleStack.getProperty("alignment") as Alignment | undefined;
		return node;
	}

	measureAttachment(node: MeasuredPdfNode): MeasuredPdfNode {
		node._width = isNumber(node.width) ? node.width : 7;
		node._height = isNumber(node.height) ? node.height : 18;

		return node;
	}
}

export default DocMeasure;
