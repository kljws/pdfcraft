import type PageElementWriter from "../../layout/element-writer.page";
import type { FlowAdvance } from "../../engine/layout-pagination";
import type { PageOrientation } from "../../types";
import type { LayoutPdfNode } from "../../types/internal";
import { isObject } from "../../utils/variable-type";
import { getNodeId } from "./node-id";
import { buildTextLine } from "./build-text-line";
import type { LayoutTextNode, TextInline } from "./text.types";

export type TextLayoutContext = {
	writer: PageElementWriter;
	advanceFlowRegion(pageOrientation?: PageOrientation): FlowAdvance;
};

function linkPageReferences(
	line: NonNullable<ReturnType<typeof buildTextLine>>,
	node: LayoutTextNode,
): void {
	if (node._tocItemRef) line._pageNodeRef = node._tocItemRef;
	if (node._pageRef) line._pageNodeRef = node._pageRef._nodeRef;
	if (line._pageNodeRef) line._pageReferenceText = node._pageReferenceText;
	for (const inline of line.inlines as TextInline[]) {
		if (inline._tocItemRef) inline._pageNodeRef = inline._tocItemRef;
		if (inline._pageRef) inline._pageNodeRef = inline._pageRef._nodeRef;
	}
}

export function layoutText(node: LayoutTextNode, context: TextLayoutContext): void {
	// Every constructed or rebuilt line links its page numbers to their targets, which the
	// convergence check and the renderer rely on.
	const nextLine = () => {
		const built = buildTextLine(node, context.writer.context().availableWidth);
		if (built) linkPageReferences(built, node);
		return built;
	};
	let line = nextLine();
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
					text:
						outlineNode.outlineText ||
						("text" in outlineNode ? String(outlineNode.text ?? "") : ""),
					expanded: outlineNode.outlineExpanded || false,
				};
			}
		}
	}

	while (line && (maxHeight === -1 || currentHeight < maxHeight)) {
		line._node = node;
		if (
			line.getHeight() > context.writer.context().availableHeight &&
			context.writer.context().y > context.writer.context().pageMargins.top
		) {
			// A new region of a container flow may have another width: the line is rebuilt for it.
			if (context.advanceFlowRegion(node.pageOrientation) === "region") {
				if (line.inlines.length > 0) {
					node.metrics.inlines.unshift(...line.inlines);
				}
				line = nextLine();
				continue;
			}
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
