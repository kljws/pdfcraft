import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { measureToc } from "./measure-toc";
import {
	preprocessToc,
	registerTocItem,
	type TocItemRegistrationContext,
	type TocPreprocessContext,
} from "./preprocess-toc";
import type { LayoutTocNode, MeasuredTocNode, PreprocessedTocNode } from "./toc.types";

interface TocFeatureStages extends NodeFeatureStages {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedTocNode;
	measureNode: MeasuredTocNode;
	measuredNode: MeasuredTocNode;
	layoutNode: LayoutTocNode;
	renderNode: never;
	preprocessContext: TocPreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
	renderContext: never;
}

interface TocFeature extends NodeFeature<TocFeatureStages> {
	readonly kind: "toc";
	preprocess(node: PdfNode, context: TocPreprocessContext): PreprocessedTocNode;
	registerItem(node: PreprocessedPdfNode, context: TocItemRegistrationContext): void;
	measure(node: MeasuredTocNode, context: NodeMeasureContext): MeasuredTocNode;
	layout(node: LayoutTocNode, context: NodeLayoutContext): void;
}

export const tocFeature = {
	kind: "toc",
	matches(node): boolean {
		return Boolean(node.toc);
	},
	preprocess: preprocessToc,
	registerItem: registerTocItem,
	measure(node, context): MeasuredTocNode {
		return measureToc(node, {
			measureNode: (item) => context.measureNode(item),
		});
	},
	layout(node, context): void {
		const toc = node.toc;
		if (!toc) throw new Error("Internal layout error: expected a preprocessed TOC node");
		if (!toc._table && toc.hideEmpty === true) return;

		if (toc.title) context.processNode(toc.title);
		if (toc._table) context.processNode(toc._table);
	},
} satisfies TocFeature;
