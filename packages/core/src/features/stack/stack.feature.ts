import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutStack, type StackLayoutContext } from "./layout-stack";
import { measureStack, type StackMeasureContext } from "./measure-stack";
import {
	preprocessDecoratedStack,
	type DecoratedStackPreprocessContext,
} from "./preprocess-decorated-stack";
import { preprocessStack, type StackPreprocessContext } from "./preprocess-stack";
import type { LayoutStackNode, MeasuredStackNode, PreprocessedStackNode } from "./stack.types";

interface StackFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedStackNode;
	measuredNode: MeasuredStackNode;
	layoutNode: LayoutStackNode;
	renderNode: never;
	preprocessContext: StackPreprocessContext;
	measureContext: StackMeasureContext;
	layoutContext: StackLayoutContext;
	renderContext: never;
}

interface StackFeature extends NodeFeature<StackFeatureStages> {
	preprocess(node: PdfNode, context: StackPreprocessContext): PreprocessedStackNode;
	preprocessDecorated(node: PdfNode, context: DecoratedStackPreprocessContext): PreprocessedPdfNode;
	measure(node: MeasuredStackNode, context: StackMeasureContext): MeasuredStackNode;
	layout(node: LayoutStackNode, context: StackLayoutContext): void;
}

export const stackFeature: StackFeature = {
	kind: "stack",
	matches(node): boolean {
		return Boolean(node.stack);
	},
	preprocess: preprocessStack,
	preprocessDecorated: preprocessDecoratedStack,
	measure: measureStack,
	layout: layoutStack,
};
