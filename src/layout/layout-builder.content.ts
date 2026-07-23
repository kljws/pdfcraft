import type { LayoutPdfNode, LineLike, ListMarker } from "../types/internal";
import { isObject } from "../utils/variable-type";
import { getNodeId } from "../utils/node";
import { offsetVector } from "../utils/tools";
import TextInlines from "../text/text-inlines";
import { addAll, cloneInline, findMaxFitLength } from "./layout-builder.helpers";
import type PageElementWriter from "./element-writer.page";
import Line from "./line";

interface LayoutBuilderContentHost {
	writer: PageElementWriter;
	pageSize: { width: number };
	suppressLinearNodeList: boolean;
	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void;
	snakingAwarePageBreak(pageOrientation?: string): void;
}

class LayoutBuilderContent {
	constructor(private readonly host: LayoutBuilderContentHost) {}

	private get writer(): PageElementWriter {
		return this.host.writer;
	}

	private get pageSize(): { width: number } {
		return this.host.pageSize;
	}

	private processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void {
		this.host.processNode(node, isVerticalAlignmentAllowed);
	}

	private snakingAwarePageBreak(pageOrientation?: string): void {
		this.host.snakingAwarePageBreak(pageOrientation);
	}

	// lists
	processList(orderedList: boolean, node: LayoutPdfNode): void {
		const addMarkerToFirstLeaf = (line: LineLike) => {
			// I'm not very happy with the way list processing is implemented
			// (both code and algorithm should be rethinked)
			if (nextMarker && !this.host.suppressLinearNodeList) {
				let marker = nextMarker;
				nextMarker = null;

				if (marker.canvas) {
					const vector = marker.canvas[0];

					offsetVector(vector, -marker._minWidth, 0);
					this.writer.addVector(vector);
				} else if (marker._inlines) {
					let markerLine = new Line(this.pageSize.width);
					markerLine.addInline(marker._inlines[0]);
					markerLine.x = -marker._minWidth;
					markerLine.y = line.getAscenderHeight() - markerLine.getAscenderHeight();
					this.writer.addLine(markerLine, true);
				}
			}
		};

		const items = (orderedList ? node.ol : node.ul)!;
		const gapSize = node._gapSize!;

		this.writer.context().addMargin(gapSize.width);

		let nextMarker: ListMarker | null = null;

		this.writer.addListener("lineAdded", addMarkerToFirstLeaf);

		items.forEach((item: LayoutPdfNode) => {
			nextMarker = item.listMarker ?? null;
			this.processNode(item);
			addAll(node.positions!, item.positions!);
		});

		this.writer.removeListener("lineAdded", addMarkerToFirstLeaf);

		this.writer.context().addMargin(-gapSize.width);
	}

	// tables
	processLeaf(node: LayoutPdfNode): void {
		let line = this.buildNextLine(node);
		if (line) {
			line._node = node;
		}
		let currentHeight = line ? line.getHeight() : 0;
		let maxHeight = node.maxHeight || -1;

		if (line) {
			let nodeId = getNodeId(node);
			if (nodeId) {
				line.id = nodeId;
			}
		}

		if (line && node.outline) {
			line._outline = {
				id: node.id,
				parentId: node.outlineParentId,
				text: node.outlineText || String(node.text ?? ""),
				expanded: node.outlineExpanded || false,
			};
		} else if (line && Array.isArray(node.text)) {
			for (let i = 0, l = node.text.length; i < l; i++) {
				const item = node.text[i];
				if (isObject(item) && item.outline) {
					const outlineNode = item as LayoutPdfNode;
					line._outline = {
						id: outlineNode.id,
						parentId: outlineNode.outlineParentId,
						text: outlineNode.outlineText || String(outlineNode.text ?? ""),
						expanded: outlineNode.outlineExpanded || false,
					};
				}
			}
		}

		if (line && node._tocItemRef) {
			line._pageNodeRef = node._tocItemRef;
		}

		if (line && node._pageRef) {
			line._pageNodeRef = node._pageRef._nodeRef;
		}

		if (line && line.inlines && Array.isArray(line.inlines)) {
			for (let i = 0, l = line.inlines.length; i < l; i++) {
				const inline = line.inlines[i];
				if (inline._tocItemRef) {
					inline._pageNodeRef = inline._tocItemRef;
				}

				if (inline._pageRef) {
					inline._pageNodeRef = inline._pageRef._nodeRef;
				}
			}
		}

		while (line && (maxHeight === -1 || currentHeight < maxHeight)) {
			line._node = node;
			// Check if line fits vertically in current context
			if (
				line.getHeight() > this.writer.context().availableHeight &&
				this.writer.context().y > this.writer.context().pageMargins.top
			) {
				// Line doesn't fit, forced move to next page/column
				// Only do snaking-specific break if we're in snaking columns AND NOT inside
				// a nested non-snaking group (like a table row). Table cells should use
				// standard page breaks — column breaks happen between table rows instead.
				if (
					this.writer.context().inSnakingColumns() &&
					!this.writer.context().isInNestedNonSnakingGroup()
				) {
					this.snakingAwarePageBreak(node.pageOrientation);

					// Always reflow text after a snaking break (column or page).
					// This ensures text adapts to the new column width, whether it's narrower or wider.
					if (line.inlines && line.inlines.length > 0) {
						node._inlines!.unshift(...line.inlines);
					}
					// Rebuild line with new width
					line = this.buildNextLine(node);
					continue;
				} else {
					this.writer.moveToNextPage(node.pageOrientation);
				}
			}

			let positions = this.writer.addLine(line);
			if (positions) {
				line._position = positions;
				node.positions!.push(positions);
			}
			line = this.buildNextLine(node);
			if (line) {
				currentHeight += line.getHeight();
			}
		}
	}

	processToc(node: LayoutPdfNode): void {
		const toc = node.toc!;
		if (!toc._table && toc.hideEmpty === true) {
			return;
		}

		if (toc.title) {
			this.processNode(toc.title);
		}
		if (toc._table) {
			this.processNode(toc._table);
		}
	}

	buildNextLine(textNode: LayoutPdfNode): Line | null {
		if (!textNode._inlines || textNode._inlines.length === 0) {
			return null;
		}

		let line = new Line(this.writer.context().availableWidth);
		const textInlines = new TextInlines(null);

		let isForceContinue = false;
		while (
			textNode._inlines &&
			textNode._inlines.length > 0 &&
			(line.hasEnoughSpaceForInline(textNode._inlines[0], textNode._inlines.slice(1)) ||
				isForceContinue)
		) {
			let isHardWrap = false;
			const inline = textNode._inlines.shift()!;

			if (!inline.noWrap && inline.text.length > 1 && inline.width > line.getAvailableWidth()) {
				let maxChars = findMaxFitLength(inline.text, line.getAvailableWidth(), (txt: string) =>
					textInlines.widthOfText(txt, inline),
				);
				if (maxChars < inline.text.length) {
					let newInline = cloneInline(inline);

					newInline.text = inline.text.substr(maxChars);
					inline.text = inline.text.substr(0, maxChars);

					newInline.width = textInlines.widthOfText(newInline.text, newInline);
					inline.width = textInlines.widthOfText(inline.text, inline);

					textNode._inlines.unshift(newInline);
					isHardWrap = true;
				}
			}

			line.addInline(inline);

			isForceContinue = Boolean(inline.noNewLine && !isHardWrap);
		}

		line.lastLineInParagraph = textNode._inlines.length === 0;

		return line;
	}

	// images
	processImage(node: LayoutPdfNode): void {
		let position = this.writer.addImage(node);
		if (position) {
			node._position = position;
			node.positions!.push(position);
		}
		node._node = node;
	}

	processCanvas(node: LayoutPdfNode): void {
		let positions = this.writer.addCanvas(node);
		if (positions) {
			addAll(node.positions!, positions);
			for (let index = 0; index < (node.canvas?.length ?? 0); index++) {
				node.canvas![index]._position = positions[index];
			}
		}
		for (const vector of node.canvas ?? []) vector._node = node;
	}

	processSVG(node: LayoutPdfNode): void {
		let position = this.writer.addSVG(node);
		if (position) {
			node._position = position;
			node.positions!.push(position);
		}
		node._node = node;
	}

	processQr(node: LayoutPdfNode): void {
		let position = this.writer.addQr(node);
		if (position) {
			node.positions!.push(position);
			for (const vector of node._canvas ?? []) vector._position = position;
		}
		for (const vector of node._canvas ?? []) vector._node = node;
	}

	processAttachment(node: LayoutPdfNode): void {
		let position = this.writer.addAttachment(node);
		if (position) {
			node._position = position;
			node.positions!.push(position);
		}
		node._node = node;
	}

	processAcroForm(node: LayoutPdfNode): void {
		const position = this.writer.addAcroForm(node);
		if (position) {
			node._position = position;
			node.positions!.push(position);
		}
		node._node = node;
	}
}

export default LayoutBuilderContent;
