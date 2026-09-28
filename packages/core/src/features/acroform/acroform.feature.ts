import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
	NodePlaceContext,
} from "../../engine/contracts/node-feature";
import { layoutFeatureItem, placeAtomicItem } from "../../layout/element-writer.helpers";
import type PDFDocument from "../../rendering/pdf-document";
import type { CurrentPosition, Inline, PdfNode } from "../../types/internal";
import { measureAcroForm, measureInlineAcroForm } from "./measure-acroform";
import { preprocessAcroForm } from "./preprocess-acroform";
import { AcroFormRenderer } from "./render-acroform";
import type {
	LayoutAcroFormNode,
	MeasuredAcroFormNode,
	PreprocessedAcroFormNode,
} from "./acroform.types";

type AcroFormFeatureStages = NodeFeatureStages & {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedAcroFormNode;
	measuredNode: MeasuredAcroFormNode;
	layoutNode: LayoutAcroFormNode;
	renderNode: LayoutAcroFormNode | Inline;
	preprocessContext: undefined;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: AcroFormRenderContext;
};

export type AcroFormRenderContext = {
	renderer: AcroFormRenderer;
	x: number;
	y: number;
};

type AcroFormFeature = NodeFeature<AcroFormFeatureStages> & {
	readonly kind: "acroform";
	preprocess(node: PdfNode): PreprocessedAcroFormNode;
	createRenderer(document: PDFDocument): AcroFormRenderer;
	measure(node: MeasuredAcroFormNode, context: NodeMeasureContext): MeasuredAcroFormNode;
	measureInline(inline: Inline): Inline;
	place(node: LayoutAcroFormNode, context: NodePlaceContext): CurrentPosition | false;
	layout(node: LayoutAcroFormNode, context: NodeLayoutContext): void;
	render(node: LayoutAcroFormNode | Inline, context: AcroFormRenderContext): void;
};

export const acroFormFeature = {
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
	place(node, context): CurrentPosition | false {
		const height = typeof node.height === "number" ? node.height : 15;
		return placeAtomicItem("acroform", node, height, context, {
			prepare: ({ availableWidth }) => {
				node._width = typeof node.width === "number" ? node.width : Math.max(0, availableWidth);
				node._height = height;
				return height;
			},
		});
	},
	layout(node, context): void {
		layoutFeatureItem("acroform", node, context.writer);
	},
	createRenderer(document): AcroFormRenderer {
		return new AcroFormRenderer(document);
	},
	render(node, { renderer, x, y }): void {
		renderer.render(node, x, y);
	},
} satisfies AcroFormFeature;
