export interface NodeStageHandler<Node, Context, Result> {
	matches(node: Node): boolean;
	process(node: Node, context: Context): Result | undefined;
}

export type NodeStageDispatchResult<Result> =
	| { handled: true; value: Result | undefined }
	| { handled: false };

export function dispatchNodeStage<Node, Context, Result>(
	node: Node,
	context: Context,
	handlers: readonly NodeStageHandler<Node, Context, Result>[],
): NodeStageDispatchResult<Result> {
	for (const handler of handlers) {
		if (handler.matches(node)) {
			return { handled: true, value: handler.process(node, context) };
		}
	}
	return { handled: false };
}
