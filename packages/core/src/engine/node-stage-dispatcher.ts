export interface NodeStageHandler<Node, Context, Result> {
	kind?: string;
	matches(node: Node): boolean;
	process(node: Node, context: Context): Result | undefined;
}

export type NodeStageDispatchResult<Result> =
	| { handled: true; kind?: string; value: Result | undefined }
	| { handled: false };

function getNodeKind(node: unknown): string | undefined {
	if (typeof node !== "object" || node === null || !("_kind" in node)) return undefined;
	return typeof node._kind === "string" ? node._kind : undefined;
}

export function dispatchNodeStage<Node, Context, Result>(
	node: Node,
	context: Context,
	handlers: readonly NodeStageHandler<Node, Context, Result>[],
): NodeStageDispatchResult<Result> {
	const kind = getNodeKind(node);
	if (kind) {
		const handlersByKind = new Map(
			handlers.flatMap((handler) => (handler.kind ? [[handler.kind, handler] as const] : [])),
		);
		const handler = handlersByKind.get(kind);
		return handler
			? { handled: true, kind, value: handler.process(node, context) }
			: { handled: false };
	}

	for (const handler of handlers) {
		if (handler.matches(node)) {
			return { handled: true, kind: handler.kind, value: handler.process(node, context) };
		}
	}
	return { handled: false };
}
