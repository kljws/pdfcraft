import type { NodeFeature, NodeFeatureStages, NodeLayoutContext, NodeMeasureContext, NodePlaceContext } from "../../engine/contracts/node-feature";
import type { LayoutPdfNode, MeasurePdfNode, PdfNode } from "../../types/internal";
import { decorateCanvas, resetCanvas } from "./decorate-canvas";
import { layoutCanvas } from "./layout-canvas";
import { measureCanvas } from "./measure-canvas";
import { placeCanvasItem } from "./place-canvas";
import type { LayoutCanvasNode, MeasuredCanvasNode, PreprocessedCanvasNode } from "./canvas.types";

interface CanvasFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedCanvasNode;
	measureNode: MeasurePdfNode;
	measuredNode: MeasuredCanvasNode;
	layoutNode: LayoutCanvasNode;
	renderNode: never;
	preprocessContext: undefined;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: never;
}

interface CanvasFeature extends NodeFeature<CanvasFeatureStages> {
	readonly kind: "canvas";
	preprocess(node: PdfNode, context: undefined): PreprocessedCanvasNode;
	measure(node: MeasurePdfNode, context: NodeMeasureContext): MeasuredCanvasNode;
	place(node: LayoutCanvasNode, context: NodePlaceContext): ReturnType<typeof placeCanvasItem>;
	layout(node: LayoutPdfNode, context: NodeLayoutContext): void;
	decorate(node: LayoutPdfNode): void;
	reset(node: LayoutPdfNode): void;
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
	measure(node, context): MeasuredCanvasNode {
		return measureCanvas(node as MeasuredCanvasNode, context.styles);
	},
	layout(node, context): void {
		layoutCanvas(node as LayoutCanvasNode, { writer: context.writer });
	},
	place: placeCanvasItem,
	decorate(node): void {
		decorateCanvas(node as LayoutCanvasNode);
	},
	reset(node): void {
		resetCanvas(node as LayoutCanvasNode);
	},
};
