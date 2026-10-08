import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutStack } from "./layout-stack";
import { measureStack } from "./measure-stack";
import { layoutDecoratedStack } from "./layout-decorated-stack";
import { preprocessStack, type StackPreprocessContext } from "./preprocess-stack";
import { hasStackDecoration, resolveStackDecoration } from "./stack-decoration";
import type { LayoutStackNode, MeasuredStackNode, PreprocessedStackNode } from "./stack.types";

type StackFeatureStages = NodeFeatureStages & {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedStackNode;
	measuredNode: MeasuredStackNode;
	layoutNode: LayoutStackNode;
	preprocessContext: StackPreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
};

type StackFeature = NodeFeature<StackFeatureStages> & {
	readonly kind: "stack";
	preprocess(node: PdfNode, context: StackPreprocessContext): PreprocessedStackNode;
	measure(node: MeasuredStackNode, context: NodeMeasureContext): MeasuredStackNode;
	layout(node: LayoutStackNode, context: NodeLayoutContext): void;
	preparePage(node: LayoutStackNode, context: NodeLayoutContext): void;
	establishesFirstPage(node: LayoutStackNode, context: NodeLayoutContext): boolean;
};

export const stackFeature = {
	kind: "stack",
	contentKeys: ["stack"],
	matches(node): boolean {
		return Boolean(node.stack);
	},
	preprocess(node, context): PreprocessedStackNode {
		// The decoration is resolved once; later layout passes find it on the preprocessed node.
		const decoration = hasStackDecoration(node) ? resolveStackDecoration(node) : undefined;
		const stackNode = preprocessStack(node, context);
		if (decoration) stackNode._decoration = decoration;
		return stackNode;
	},
	measure(node, context): MeasuredStackNode {
		return measureStack(node, context);
	},
	layout(node, context): void {
		if (node._decoration) {
			layoutDecoratedStack(node, node._decoration, context);
			return;
		}
		layoutStack(node, {
			processNode: (item) => context.processNode(item),
			moveDownWithPageBreak: context.moveDownWithPageBreak,
		});
	},
	/** A stack starts on the page its first item establishes. */
	preparePage(node, context): void {
		const [firstItem] = node.stack;
		if (firstItem) context.preparePage(firstItem);
	},
	establishesFirstPage(node, context): boolean {
		const [firstItem] = node.stack;
		return firstItem !== undefined && context.establishesFirstPage(firstItem);
	},
} satisfies StackFeature;
