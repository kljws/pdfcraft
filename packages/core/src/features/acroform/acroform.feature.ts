import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import { layoutFeatureItem } from "../../layout/element-writer.helpers";
import type PDFDocument from "../../rendering/pdf-document";
import type { Inline, PdfNode } from "../../types/internal";
import { measureAcroForm, measureInlineAcroForm } from "./measure-acroform";
import { placeAcroFormItem } from "./place-acroform";
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
	measureNode: MeasuredAcroFormNode;
	measuredNode: MeasuredAcroFormNode;
	layoutNode: LayoutAcroFormNode;
	renderNode: LayoutAcroFormNode | Inline;
	preprocessContext: undefined;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: AcroFormRenderContext;
}

export interface AcroFormRenderContext {
	renderer: AcroFormRenderer;
	x: number;
	y: number;
}

interface AcroFormFeature extends NodeFeature<AcroFormFeatureStages> {
	readonly kind: "acroform";
	preprocess(node: PdfNode): PreprocessedAcroFormNode;
	createRenderer(document: PDFDocument): AcroFormRenderer;
	measure(node: MeasuredAcroFormNode, context: NodeMeasureContext): MeasuredAcroFormNode;
	measureInline(inline: Inline): Inline;
	place(node: LayoutAcroFormNode, context: NodePlaceContext): ReturnType<typeof placeAcroFormItem>;
	layout(node: LayoutAcroFormNode, context: NodeLayoutContext): void;
	render(node: LayoutAcroFormNode | Inline, context: AcroFormRenderContext): void;
}

export const acroFormFeature: AcroFormFeature = {
	kind: "acroform",
	matches(node): boolean {
		return Boolean(node.acroform);
	},
	preprocess: preprocessAcroForm,
	measure(node, context): MeasuredAcroFormNode {
		return measureAcroForm(node, {
			document: context.document,
			styles: context.styles,
		});
	},
	measureInline: measureInlineAcroForm,
	place: placeAcroFormItem,
	layout(node, context): void {
		layoutFeatureItem("acroform", node, context.writer);
	},
	createRenderer(document): AcroFormRenderer {
		return new AcroFormRenderer(document);
	},
	render(node, { renderer, x, y }): void {
		renderer.render(node, x, y);
	},
};
