import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutStack, type StackLayoutContext } from "./layout-stack";
import { measureStack, type StackMeasureContext } from "./measure-stack";
import {
	preprocessDecoratedStack,
	type DecoratedStackPreprocessContext,
} from "./preprocess-decorated-stack";
import { preprocessStack, type StackPreprocessContext } from "./preprocess-stack";

interface StackFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: never;
	preprocessContext: StackPreprocessContext;
	measureContext: StackMeasureContext;
	layoutContext: StackLayoutContext;
	renderContext: never;
}

interface StackFeature extends NodeFeature<StackFeatureStages> {
	preprocessDecorated(
		node: PreprocessedPdfNode,
		context: DecoratedStackPreprocessContext,
	): PreprocessedPdfNode;
	measure(node: MeasuredPdfNode, context: StackMeasureContext): MeasuredPdfNode;
	layout(node: LayoutPdfNode, context: StackLayoutContext): void;
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
