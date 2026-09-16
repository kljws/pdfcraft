import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type {
	LayoutPdfNode,
	LineLike,
	MeasuredPdfNode,
	PreprocessedPdfNode,
} from "../../types/internal";
import { buildTextLine } from "./build-text-line";
import { layoutText, type TextLayoutContext } from "./layout-text";
import { measureText, type TextMeasureContext } from "./measure-text";
import { preprocessText, type TextPreprocessContext } from "./preprocess-text";
import { renderTextLine, type TextRenderContext } from "./render-text";

interface TextFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: LineLike;
	preprocessContext: TextPreprocessContext;
	measureContext: TextMeasureContext;
	layoutContext: TextLayoutContext;
	renderContext: TextRenderContext;
}

interface TextFeature extends NodeFeature<TextFeatureStages> {
	matchesReference(node: PreprocessedPdfNode): boolean;
	measure(node: MeasuredPdfNode, context: TextMeasureContext): MeasuredPdfNode;
	buildLine(node: LayoutPdfNode, availableWidth: number): ReturnType<typeof buildTextLine>;
	layout(node: LayoutPdfNode, context: TextLayoutContext): void;
	render(line: LineLike, context: TextRenderContext): void;
}

export const textFeature: TextFeature = {
	kind: "text",
	matches(node): boolean {
		return node.text !== undefined;
	},
	matchesReference(node): boolean {
		return Boolean(node.pageReference || node.textReference);
	},
	preprocess: preprocessText,
	measure: measureText,
	buildLine: buildTextLine,
	layout: layoutText,
	render: renderTextLine,
};
