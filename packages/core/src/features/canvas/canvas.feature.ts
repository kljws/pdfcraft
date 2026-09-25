import { markNodeKind } from "../../utils/node";
import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { decorateCanvas, resetCanvas } from "./decorate-canvas";
import { layoutCanvas } from "./layout-canvas";
import { measureCanvas } from "./measure-canvas";
import { placeCanvasItem } from "./place-canvas";
import type { LayoutCanvasNode, MeasuredCanvasNode, PreprocessedCanvasNode } from "./canvas.types";

interface CanvasFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedCanvasNode;
	measureNode: MeasuredCanvasNode;
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
	preprocess(node: PdfNode): PreprocessedCanvasNode;
	measure(node: MeasuredCanvasNode, context: NodeMeasureContext): MeasuredCanvasNode;
	place(node: LayoutCanvasNode, context: NodePlaceContext): ReturnType<typeof placeCanvasItem>;
	layout(node: LayoutCanvasNode, context: NodeLayoutContext): void;
	decorate(node: LayoutCanvasNode): void;
	reset(node: LayoutCanvasNode): void;
}

export const canvasFeature: CanvasFeature = {
	kind: "canvas",
	matches(node): boolean {
		return Boolean(node.canvas);
	},
	preprocess(node): PreprocessedCanvasNode {
		return markNodeKind(node, "canvas");
	},
	measure(node, context): MeasuredCanvasNode {
		return measureCanvas(node, context.styles);
	},
	layout(node, context): void {
		layoutCanvas(node, { writer: context.writer });
	},
	place: placeCanvasItem,
	decorate(node): void {
		decorateCanvas(node);
	},
	reset(node): void {
		resetCanvas(node);
	},
};
