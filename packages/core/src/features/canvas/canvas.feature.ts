import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type StyleContextStack from "../../services/styles/style-context-stack";
import type { LayoutPdfNode, MeasuredPdfNode, PreprocessedPdfNode } from "../../types/internal";
import { decorateCanvas, resetCanvas } from "./decorate-canvas";
import { layoutCanvas, type CanvasLayoutContext } from "./layout-canvas";
import { measureCanvas } from "./measure-canvas";
import { placeCanvas, type CanvasWriter } from "./place-canvas";

interface CanvasFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: never;
	preprocessContext: undefined;
	measureContext: StyleContextStack;
	layoutContext: CanvasLayoutContext;
	renderContext: never;
}

interface CanvasFeature extends NodeFeature<CanvasFeatureStages> {
	measure(node: MeasuredPdfNode, context: StyleContextStack): MeasuredPdfNode;
	place(writer: CanvasWriter, node: LayoutPdfNode, index?: number): ReturnType<typeof placeCanvas>;
	layout(node: LayoutPdfNode, context: CanvasLayoutContext): void;
	decorate(node: LayoutPdfNode): void;
	reset(node: LayoutPdfNode): void;
}

export const canvasFeature: CanvasFeature = {
	kind: "canvas",
	matches(node): boolean {
		return Boolean(node.canvas);
	},
	preprocess(node): PreprocessedPdfNode {
		return node;
	},
	measure: measureCanvas,
	layout: layoutCanvas,
	place: placeCanvas,
	decorate: decorateCanvas,
	reset: resetCanvas,
};
