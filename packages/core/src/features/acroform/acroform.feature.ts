import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type PDFDocument from "../../rendering/pdf-document";
import type {
	Inline,
	LayoutPdfNode,
	MeasuredPdfNode,
	PreprocessedPdfNode,
} from "../../types/internal";
import { layoutAcroForm, type AcroFormLayoutContext } from "./layout-acroform";
import {
	measureAcroForm,
	measureInlineAcroForm,
	type AcroFormMeasureContext,
} from "./measure-acroform";
import { placeAcroForm, type AcroFormWriter } from "./place-acroform";
import { preprocessAcroForm } from "./preprocess-acroform";
import { AcroFormRenderer } from "./render-acroform";

interface AcroFormFeatureStages extends NodeFeatureStages {
	preprocessedNode: PreprocessedPdfNode;
	measuredNode: MeasuredPdfNode;
	layoutNode: LayoutPdfNode;
	renderNode: LayoutPdfNode | Inline;
	preprocessContext: undefined;
	measureContext: AcroFormMeasureContext;
	layoutContext: AcroFormLayoutContext;
	renderContext: { renderer: AcroFormRenderer; x: number; y: number };
}

interface AcroFormFeature extends NodeFeature<AcroFormFeatureStages> {
	createRenderer(document: PDFDocument): AcroFormRenderer;
	measure(node: MeasuredPdfNode, context: AcroFormMeasureContext): MeasuredPdfNode;
	measureInline(inline: Inline): Inline;
	place(
		writer: AcroFormWriter,
		node: LayoutPdfNode,
		index?: number,
	): ReturnType<typeof placeAcroForm>;
	layout(node: LayoutPdfNode, context: AcroFormLayoutContext): void;
	render(
		node: LayoutPdfNode | Inline,
		context: { renderer: AcroFormRenderer; x: number; y: number },
	): void;
}

export const acroFormFeature: AcroFormFeature = {
	kind: "acroform",
	matches(node): boolean {
		return Boolean(node.acroform);
	},
	preprocess: preprocessAcroForm,
	measure: measureAcroForm,
	measureInline: measureInlineAcroForm,
	place: placeAcroForm,
	layout: layoutAcroForm,
	createRenderer(document): AcroFormRenderer {
		return new AcroFormRenderer(document);
	},
	render(node, { renderer, x, y }): void {
		renderer.render(node, x, y);
	},
};
