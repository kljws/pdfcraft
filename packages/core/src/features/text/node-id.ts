import { isString } from "../../utils/variable-type";

/**
 * Destination id of a node: its own `id`, otherwise the first `id` found in its nested text
 * fragments.
 */
export function getNodeId(node: { id?: unknown; text?: unknown }): string | null {
	if (isString(node.id)) {
		return node.id;
	}

	if (Array.isArray(node.text)) {
		for (const n of node.text) {
			if (!n || typeof n !== "object") {
				continue;
			}
			const nodeId = getNodeId(n);
			if (nodeId) {
				return nodeId;
			}
		}
	}

	return null;
}
