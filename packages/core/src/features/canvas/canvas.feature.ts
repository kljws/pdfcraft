import { markNodeKind } from "../../utils/node";
import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
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

export const canvasFeature = {
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
		const positions = context.writer.addFeatureItem("canvas", node);
		if (Array.isArray(positions)) {
			node.positions ??= [];
			node.positions.push(...positions.filter((position) => position !== undefined));
			for (let index = 0; index < (node.canvas?.length ?? 0); index++) {
				node.canvas![index]._position = positions[index];
			}
		}
		for (const vector of node.canvas ?? []) vector._node = node;
	},
	place: placeCanvasItem,
	/** Remembers each vector's coordinates so a new layout pass can restore them. */
	decorate(node): void {
		for (const vector of node.canvas ?? []) {
			const position = {
				x: vector.x,
				y: vector.y,
				x1: vector.x1,
				y1: vector.y1,
				x2: vector.x2,
				y2: vector.y2,
			};
			vector.resetXY = () => Object.assign(vector, position);
		}
	},
	reset(node): void {
		for (const vector of node.canvas ?? []) vector.resetXY?.();
	},
} satisfies CanvasFeature;
