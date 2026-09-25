import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { LineLike, MeasurePdfNode, PdfNode } from "../../types/internal";
import type TextInlines from "./text-inlines";
import { buildTextLine } from "./build-text-line";
import { layoutText } from "./layout-text";
import { measureText } from "./measure-text";
import { preprocessText, type TextPreprocessContext } from "./preprocess-text";
import { renderTextLine, type TextRenderContext } from "./render-text";
import type {
	LayoutTextNode,
	MeasuredTextNode,
	PreprocessedTextNode,
	TextMeasureNode,
} from "./text.types";

/** Inline shaping owned by text and injected by measurement composition. */
export interface TextMeasureCapabilities {
	readonly inlines: TextInlines;
}

type TextMeasureFeatureContext = NodeMeasureContext & TextMeasureCapabilities;

interface TextFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedTextNode;
	measureNode: MeasurePdfNode;
	measuredNode: TextMeasureNode;
	layoutNode: LayoutTextNode;
	renderNode: LineLike;
	preprocessContext: TextPreprocessContext;
	measureContext: TextMeasureFeatureContext;
	layoutContext: NodeLayoutContext;
	renderContext: TextRenderContext;
}

interface TextFeature extends NodeFeature<TextFeatureStages> {
	readonly kind: "text";
	preprocess(node: PdfNode, context: TextPreprocessContext): PreprocessedTextNode;
	measure(node: MeasurePdfNode, context: TextMeasureFeatureContext): MeasuredTextNode;
	buildLine(node: LayoutTextNode, availableWidth: number): ReturnType<typeof buildTextLine>;
	layout(node: LayoutTextNode, context: NodeLayoutContext): void;
	render(line: LineLike, context: TextRenderContext): void;
}

export const textFeature: TextFeature = {
	kind: "text",
	matches(node): boolean {
		return node.text !== undefined || Boolean(node.pageReference || node.textReference);
	},
	preprocess: preprocessText,
	measure(node, context): MeasuredTextNode {
		return measureText(node as TextMeasureNode, {
			inlines: context.inlines,
			styles: context.styles,
		});
	},
	buildLine: buildTextLine,
	layout(node, context): void {
		layoutText(node, {
			writer: context.writer,
			snakingAwarePageBreak: (orientation) => context.snakingAwarePageBreak(orientation),
		});
	},
	render: renderTextLine,
};
