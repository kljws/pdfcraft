import type { NodeFeature, NodeFeatureStages } from "../../engine/contracts/node-feature";
import type PDFDocument from "../../rendering/pdf-document";
import type { Inline, PdfNode } from "../../types/internal";
import { layoutAcroForm, type AcroFormLayoutContext } from "./layout-acroform";
import {
	measureAcroForm,
	measureInlineAcroForm,
	type AcroFormMeasureContext,
} from "./measure-acroform";
import { placeAcroForm, type AcroFormWriter } from "./place-acroform";
import { preprocessAcroForm } from "./preprocess-acroform";
import { AcroFormRenderer } from "./render-acroform";
import type {
	LayoutAcroFormNode,
	MeasuredAcroFormNode,
	PreprocessedAcroFormNode,
} from "./acroform.types";

interface AcroFormFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedAcroFormNode;
	measuredNode: MeasuredAcroFormNode;
	layoutNode: LayoutAcroFormNode;
	renderNode: LayoutAcroFormNode | Inline;
	preprocessContext: undefined;
	measureContext: AcroFormMeasureContext;
	layoutContext: AcroFormLayoutContext;
	renderContext: { renderer: AcroFormRenderer; x: number; y: number };
}

interface AcroFormFeature extends NodeFeature<AcroFormFeatureStages> {
	preprocess(node: PdfNode, context: undefined): PreprocessedAcroFormNode;
	createRenderer(document: PDFDocument): AcroFormRenderer;
	measure(node: MeasuredAcroFormNode, context: AcroFormMeasureContext): MeasuredAcroFormNode;
	measureInline(inline: Inline): Inline;
	place(
		writer: AcroFormWriter,
		node: LayoutAcroFormNode,
		index?: number,
	): ReturnType<typeof placeAcroForm>;
	layout(node: LayoutAcroFormNode, context: AcroFormLayoutContext): void;
	render(
		node: LayoutAcroFormNode | Inline,
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
