import type PageElementWriter from "../../layout/element-writer.page";
import type { PageOrientation } from "../../types";
import type { LayoutPdfNode } from "../../types/internal";
import { isObject } from "../../utils/variable-type";
import { getNodeId } from "../../utils/node";
import { buildTextLine } from "./build-text-line";
import type { LayoutTextNode } from "./text.types";

export interface TextLayoutContext {
	writer: PageElementWriter;
	snakingAwarePageBreak(pageOrientation?: PageOrientation): void;
}

export function layoutText(node: LayoutTextNode, context: TextLayoutContext): void {
	const nextLine = () => buildTextLine(node, context.writer.context().availableWidth);
	let line = nextLine();
	if (line) line._node = node;
	let currentHeight = line ? line.getHeight() : 0;
	const maxHeight = node.maxHeight || -1;

	if (line) {
		const nodeId = getNodeId(node);
		if (nodeId) line.id = nodeId;
	}

	if (line && node.outline) {
		line._outline = {
			id: node.id,
			parentId: node.outlineParentId,
			text: node.outlineText || String(node.text ?? ""),
			expanded: node.outlineExpanded || false,
		};
	} else if (line && Array.isArray(node.text)) {
		for (const item of node.text) {
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

	if (line && node._tocItemRef) line._pageNodeRef = node._tocItemRef;
	if (line && node._pageRef) line._pageNodeRef = node._pageRef._nodeRef;

	if (line && Array.isArray(line.inlines)) {
		for (const inline of line.inlines) {
			if (inline._tocItemRef) inline._pageNodeRef = inline._tocItemRef;
			if (inline._pageRef) inline._pageNodeRef = inline._pageRef._nodeRef;
		}
	}

	while (line && (maxHeight === -1 || currentHeight < maxHeight)) {
		line._node = node;
		if (
			line.getHeight() > context.writer.context().availableHeight &&
			context.writer.context().y > context.writer.context().pageMargins.top
		) {
			if (
				context.writer.context().inSnakingColumns() &&
				!context.writer.context().isInNestedNonSnakingGroup()
			) {
				context.snakingAwarePageBreak(node.pageOrientation);
				if (line.inlines.length > 0) {
					node.metrics.inlines.unshift(...line.inlines);
				}
				line = nextLine();
				continue;
			}
			context.writer.moveToNextPage(node.pageOrientation);
		}

		const positions = context.writer.addLine(line);
		if (positions) {
			line._position = positions;
			node.positions ??= [];
			node.positions.push(positions);
		}
		line = nextLine();
		if (line) currentHeight += line.getHeight();
	}
}
