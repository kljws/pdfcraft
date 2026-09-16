import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type { LineLike, PreprocessedPdfNode } from "../../types/internal";
import { buildTextLine } from "./build-text-line";
import { layoutText, type TextLayoutContext } from "./layout-text";
import { measureText, type TextMeasureContext } from "./measure-text";
import { preprocessText, type TextPreprocessContext } from "./preprocess-text";
import { renderTextLine, type TextRenderContext } from "./render-text";
import type {
	LayoutTextNode,
	MeasuredTextNode,
	PreprocessedTextNode,
	TextMeasureNode,
} from "./text.types";

interface TextFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: TextMeasureNode;
	layoutNode: LayoutTextNode;
	renderNode: LineLike;
	preprocessContext: TextPreprocessContext;
	measureContext: TextMeasureContext;
	layoutContext: TextLayoutContext;
	renderContext: TextRenderContext;
}

interface TextFeature extends NodeFeature<TextFeatureStages> {
	matchesReference(node: PreprocessedPdfNode): boolean;
	preprocess(node: PreprocessedPdfNode, context: TextPreprocessContext): PreprocessedTextNode;
	measure(node: TextMeasureNode, context: TextMeasureContext): MeasuredTextNode;
	buildLine(node: LayoutTextNode, availableWidth: number): ReturnType<typeof buildTextLine>;
	layout(node: LayoutTextNode, context: TextLayoutContext): void;
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
