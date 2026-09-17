import { acroFormFeature } from "../features/acroform/acroform.feature";
import { attachmentFeature } from "../features/attachment/attachment.feature";
import { canvasFeature } from "../features/canvas/canvas.feature";
import { columnsFeature } from "../features/columns/columns.feature";
import { imageFeature } from "../features/image/image.feature";
import { listFeature } from "../features/list/list.feature";
import { sectionFeature } from "../features/section/section.feature";
import { stackFeature } from "../features/stack/stack.feature";
import { tableFeature } from "../features/table/table.feature";
import { textFeature } from "../features/text/text.feature";
import { tocFeature } from "../features/toc/toc.feature";
import type { PdfNode } from "../types/internal";
import type { NodeStageHandler } from "../engine/node-stage-dispatcher";

export type BuiltInFeatureName =
	| "section"
	| "columns"
	| "stack"
	| "list"
	| "table"
	| "text"
	| "toc"
	| "image"
	| "canvas"
	| "attachment"
	| "acroform";

export interface BuiltInFeatureProcessors<Node, Context, Result> {
	section(node: Node, context: Context): Result;
	columns(node: Node, context: Context): Result;
	stack(node: Node, context: Context): Result;
	list(node: Node, context: Context): Result;
	table(node: Node, context: Context): Result;
	text(node: Node, context: Context): Result;
	toc(node: Node, context: Context): Result;
	image(node: Node, context: Context): Result;
	canvas(node: Node, context: Context): Result;
	attachment(node: Node, context: Context): Result;
	acroform(node: Node, context: Context): Result;
}

const DEFAULT_FEATURE_ORDER: readonly BuiltInFeatureName[] = [
	"section",
	"columns",
	"stack",
	"list",
	"table",
	"text",
	"toc",
	"image",
	"canvas",
	"attachment",
	"acroform",
];

const FEATURE_MATCHERS: Record<BuiltInFeatureName, (node: PdfNode) => boolean> = {
	section: (node) => sectionFeature.matches(node),
	columns: (node) => columnsFeature.matches(node),
	stack: (node) => stackFeature.matches(node),
	list: (node) => listFeature.matches(node),
	table: (node) => tableFeature.matches(node),
	text: (node) => textFeature.matches(node),
	toc: (node) => tocFeature.matches(node),
	image: (node) => imageFeature.matches(node),
	canvas: (node) => canvasFeature.matches(node),
	attachment: (node) => attachmentFeature.matches(node),
	acroform: (node) => acroFormFeature.matches(node),
};

export function getBuiltInFeatureKind(node: PdfNode): BuiltInFeatureName | undefined {
	return DEFAULT_FEATURE_ORDER.find((name) => FEATURE_MATCHERS[name](node));
}

export function createBuiltInFeatureHandlers<Node extends PdfNode, Context, Result>(
	processors: BuiltInFeatureProcessors<Node, Context, Result>,
	order: readonly BuiltInFeatureName[] = DEFAULT_FEATURE_ORDER,
): NodeStageHandler<Node, Context, Result>[] {
	const handler = (
		kind: BuiltInFeatureName,
		matches: (node: Node) => boolean,
		process: (node: Node, context: Context) => Result,
	): NodeStageHandler<Node, Context, Result> => ({ kind, matches, process });

	return order.map((name) =>
		handler(name, (node) => FEATURE_MATCHERS[name](node), processors[name]),
	);
}
