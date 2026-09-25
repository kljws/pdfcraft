import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutStack } from "./layout-stack";
import { measureStack } from "./measure-stack";
import {
	preprocessDecoratedStack,
	type DecoratedStackPreprocessContext,
} from "./preprocess-decorated-stack";
import { preprocessStack, type StackPreprocessContext } from "./preprocess-stack";
import type { LayoutStackNode, MeasuredStackNode } from "./stack.types";

type StackFeaturePreprocessContext = StackPreprocessContext & DecoratedStackPreprocessContext;

const BLOCK_DECORATION_PROPERTIES = ["borderRadius", "borderWidth", "backgroundColor", "padding"];

function hasBlockDecoration(node: PdfNode): boolean {
	return BLOCK_DECORATION_PROPERTIES.some((property) => node[property] !== undefined);
}

interface StackFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedPdfNode;
	measureNode: MeasuredStackNode;
	measuredNode: MeasuredStackNode;
	layoutNode: LayoutStackNode;
	renderNode: never;
	preprocessContext: StackFeaturePreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: never;
}

interface StackFeature extends NodeFeature<StackFeatureStages> {
	readonly kind: "stack";
	preprocess(node: PdfNode, context: StackFeaturePreprocessContext): PreprocessedPdfNode;
	measure(node: MeasuredStackNode, context: NodeMeasureContext): MeasuredStackNode;
	layout(node: LayoutStackNode, context: NodeLayoutContext): void;
}

export const stackFeature = {
	kind: "stack",
	matches(node): boolean {
		return Boolean(node.stack);
	},
	preprocess(node, context): PreprocessedPdfNode {
		return hasBlockDecoration(node)
			? preprocessDecoratedStack(node, context)
			: preprocessStack(node, context);
	},
	measure(node, context): MeasuredStackNode {
		return measureStack(node, context);
	},
	layout(node, context): void {
		layoutStack(node, {
			processNode: (item) => context.processNode(item),
			moveDownWithPageBreak: context.moveDownWithPageBreak,
		});
	},
} satisfies StackFeature;
