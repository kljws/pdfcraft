import type { NodeFeature, NodeFeatureStages, NodeLayoutContext, NodeMeasureContext } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasurePdfNode, PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { layoutStack } from "./layout-stack";
import { measureStack } from "./measure-stack";
import {
	preprocessDecoratedStack,
	type DecoratedStackPreprocessContext,
} from "./preprocess-decorated-stack";
import { preprocessStack, type StackPreprocessContext } from "./preprocess-stack";
import type { LayoutStackNode, MeasuredStackNode, PreprocessedStackNode } from "./stack.types";

interface StackFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedStackNode;
	measureNode: MeasurePdfNode;
	measuredNode: MeasuredStackNode;
	layoutNode: LayoutStackNode;
	renderNode: never;
	preprocessContext: StackPreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: never;
}

interface StackFeature extends NodeFeature<StackFeatureStages> {
	readonly kind: "stack";
	preprocess(node: PdfNode, context: StackPreprocessContext): PreprocessedStackNode;
	preprocessDecorated(node: PdfNode, context: DecoratedStackPreprocessContext): PreprocessedPdfNode;
	measure(node: MeasurePdfNode, context: NodeMeasureContext): MeasuredStackNode;
	layout(node: LayoutPdfNode, context: NodeLayoutContext): void;
}

export const stackFeature: StackFeature = {
	kind: "stack",
	matches(node): boolean {
		return Boolean(node.stack);
	},
	preprocess: preprocessStack,
	preprocessDecorated: preprocessDecoratedStack,
	measure(node, context): MeasuredStackNode {
		return measureStack(node as MeasuredStackNode, {
			measureChild: (item) => context.measureNode(item),
		});
	},
	layout(node, context): void {
		layoutStack(node as LayoutStackNode, {
			processNode: (item) => context.processNode(item),
			moveDownWithPageBreak: context.moveDownWithPageBreak,
		});
	},
};
