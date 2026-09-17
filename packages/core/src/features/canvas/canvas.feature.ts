import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type StyleContextStack from "../../services/styles/style-context-stack";
import type { PdfNode } from "../../types/internal";
import { decorateCanvas, resetCanvas } from "./decorate-canvas";
import { layoutCanvas, type CanvasLayoutContext } from "./layout-canvas";
import { measureCanvas } from "./measure-canvas";
import { placeCanvas, type CanvasWriter } from "./place-canvas";
import type { LayoutCanvasNode, MeasuredCanvasNode, PreprocessedCanvasNode } from "./canvas.types";

interface CanvasFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedCanvasNode;
	measuredNode: MeasuredCanvasNode;
	layoutNode: LayoutCanvasNode;
	renderNode: never;
	preprocessContext: undefined;
	measureContext: StyleContextStack;
	layoutContext: CanvasLayoutContext;
	renderContext: never;
}

interface CanvasFeature extends NodeFeature<CanvasFeatureStages> {
	preprocess(node: PdfNode, context: undefined): PreprocessedCanvasNode;
	measure(node: MeasuredCanvasNode, context: StyleContextStack): MeasuredCanvasNode;
	place(
		writer: CanvasWriter,
		node: LayoutCanvasNode,
		index?: number,
	): ReturnType<typeof placeCanvas>;
	layout(node: LayoutCanvasNode, context: CanvasLayoutContext): void;
	decorate(node: LayoutCanvasNode): void;
	reset(node: LayoutCanvasNode): void;
}

export const canvasFeature: CanvasFeature = {
	kind: "canvas",
	matches(node): boolean {
		return Boolean(node.canvas);
	},
	preprocess(node): PreprocessedCanvasNode {
		node._kind = "canvas";
		return node as unknown as PreprocessedCanvasNode;
	},
	measure: measureCanvas,
	layout: layoutCanvas,
	place: placeCanvas,
	decorate: decorateCanvas,
	reset: resetCanvas,
};
