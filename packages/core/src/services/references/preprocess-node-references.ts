import type { NodeReference, PreprocessedPdfNode } from "../../types/internal";
import type { PreprocessedTextNode } from "../../features/text/text.types";

export interface NodeReferencePreprocessContext {
	parentNode: PreprocessedPdfNode | null;
	nodeReferences: Record<string, NodeReference<PreprocessedPdfNode>>;
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
		context.nodeReferences[node.pageReference] ??= {
			_nodeRef: {} as PreprocessedPdfNode,
			_textNodeRef: {} as PreprocessedPdfNode,
			_pseudo: true,
		};
		node.text = "00000";
		node.linkToDestination = node.pageReference;
		node._pageRef = context.nodeReferences[node.pageReference];
	}

	if (node.textReference) {
		context.nodeReferences[node.textReference] ??= {
			_nodeRef: {} as PreprocessedPdfNode,
			_pseudo: true,
		};
		node.text = "";
		node.linkToDestination = node.textReference;
		node._textRef = context.nodeReferences[node.textReference];
	}
}
