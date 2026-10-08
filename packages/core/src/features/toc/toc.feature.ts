import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { measureToc, type TocMeasureContext } from "./measure-toc";
import {
	preprocessToc,
	registerTocItem,
	type TocItemRegistrationContext,
	type TocPreprocessContext,
} from "./preprocess-toc";
import type { LayoutTocNode, MeasuredTocNode, PreprocessedTocNode } from "./toc.types";

/** Table normalization supplied by composition to the table of contents. */
export type TocMeasureCapabilities = Pick<TocMeasureContext, "normalizeTable" | "getNodeId">;

type TocMeasureFeatureContext = NodeMeasureContext & TocMeasureCapabilities;

type TocFeatureStages = NodeFeatureStages & {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedTocNode;
	measuredNode: MeasuredTocNode;
	layoutNode: LayoutTocNode;
	preprocessContext: TocPreprocessContext;
	measureContext: TocMeasureFeatureContext;
	layoutContext: NodeLayoutContext;
};

type TocFeature = NodeFeature<TocFeatureStages> & {
	readonly kind: "toc";
	preprocess(node: PdfNode, context: TocPreprocessContext): PreprocessedTocNode;
	registerItem(node: PreprocessedPdfNode, context: TocItemRegistrationContext): void;
	measure(node: MeasuredTocNode, context: TocMeasureFeatureContext): MeasuredTocNode;
	layout(node: LayoutTocNode, context: NodeLayoutContext): void;
};

export const tocFeature = {
	kind: "toc",
	contentKeys: ["toc"],
	matches(node): boolean {
		return Boolean(node.toc);
	},
	preprocess: preprocessToc,
	registerItem: registerTocItem,
	measure(node, context): MeasuredTocNode {
		return measureToc(node, {
			measureNode: (item) => context.measureNode(item),
			normalizeTable: (table, options) => context.normalizeTable(table, options),
			getNodeId: (target) => context.getNodeId(target),
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
