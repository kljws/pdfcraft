import type { LineLike, NodeReference, PdfPage, PreprocessedPdfNode } from "../../types/internal";
import { getLaidOutPageText, UNRESOLVED_PAGE_NUMBER_TEXT } from "../../utils/node";
import type { PreprocessedTextNode } from "./text.types";

export interface NodeReferenceRequest {
	id: string;
	kind: "pageReference" | "textReference";
}

export interface NodeReferencePreprocessContext {
	parentNode: PreprocessedPdfNode | null;
	nodeReferences: Record<string, NodeReference<PreprocessedPdfNode>>;
	/** Receives every reference made in the tree, checked once the whole tree is preprocessed. */
	requests?: NodeReferenceRequest[];
}

export function preprocessNodeReferences(
	node: PreprocessedTextNode,
	context: NodeReferencePreprocessContext,
): void {
	if (node.id) {
		const reference = context.nodeReferences[node.id];
		if (reference) {
			if (!reference._pseudo) throw new Error(`Node id '${node.id}' already exists`);
			reference._nodeRef = context.parentNode ?? node;
			reference._textNodeRef = node;
			reference._pseudo = false;
		} else {
			context.nodeReferences[node.id] = {
				_nodeRef: context.parentNode ?? node,
				_textNodeRef: node,
			};
		}
	}

	if (node.pageReference) {
		context.requests?.push({ id: node.pageReference, kind: "pageReference" });
		context.nodeReferences[node.pageReference] ??= {
			_nodeRef: {} as PreprocessedPdfNode,
			_textNodeRef: {} as PreprocessedPdfNode,
			_pseudo: true,
		};
		node.text = UNRESOLVED_PAGE_NUMBER_TEXT;
		node.linkToDestination = node.pageReference;
		node._pageRef = context.nodeReferences[node.pageReference];
	}

	if (node.textReference) {
		context.requests?.push({ id: node.textReference, kind: "textReference" });
		context.nodeReferences[node.textReference] ??= {
			_nodeRef: {} as PreprocessedPdfNode,
			_pseudo: true,
		};
		node.text = "";
		node.linkToDestination = node.textReference;
		node._textRef = context.nodeReferences[node.textReference];
	}
}

/**
 * Reports references whose id matches no node once a tree is fully preprocessed, so forward
 * references are allowed. A missing page reference target is an error, since no page number can
 * be printed. A missing text reference target renders empty text, as before, and is reported once
 * per id through `warnedTextReferences`.
 */
export function checkNodeReferences(
	nodeReferences: Record<string, NodeReference<object>>,
	requests: readonly NodeReferenceRequest[],
	warnedTextReferences: Set<string>,
): void {
	for (const { id, kind } of requests) {
		if (!nodeReferences[id]?._pseudo) continue;
		if (kind === "pageReference") {
			throw new Error(
				`Unresolved pageReference '${id}': no node in the same content has id '${id}'`,
			);
		}
		if (!warnedTextReferences.has(id)) {
			warnedTextReferences.add(id);
			console.warn(
				`Unresolved textReference '${id}': no node has id '${id}'; it renders as empty text`,
			);
		}
	}
}

/** Text to measure for a page reference: the page found by the previous pass, when there is one. */
export function getPageReferenceText(reference: NodeReference<object> | undefined): string {
	return getLaidOutPageText(reference?._nodeRef) ?? UNRESOLVED_PAGE_NUMBER_TEXT;
}

const isStale = (target: unknown, measuredText: string | undefined): boolean => {
	const actual = getLaidOutPageText(target);
	return actual !== undefined && actual !== measuredText;
};

/**
 * Whether a laid-out page number (a page reference or a TOC number) differs from the page its
 * target now occupies. Wrapping and placement were decided with the measured text, so a stale
 * number requires another layout pass rather than a correction at render time.
 */
export function hasStalePageReferences(pages: readonly PdfPage[]): boolean {
	for (const page of pages) {
		for (const entry of page.items) {
			if (entry.type !== "line") continue;
			const line = entry.item as LineLike;
			if (
				line._pageNodeRef &&
				isStale(line._pageNodeRef, line._pageReferenceText ?? line.inlines[0]?.text)
			)
				return true;
			for (const inline of line.inlines) {
				// A number wrapped across lines is split into fragments; compare the complete value.
				if (
					inline._pageNodeRef &&
					isStale(inline._pageNodeRef, inline._pageReferenceText ?? inline.text)
				) {
					return true;
				}
			}
		}
	}
	return false;
}
