import type {
	NodeFeature,
	NodeFeatureStages,
	NodeLayoutContext,
	NodeMeasureContext,
} from "../../engine/contracts/node-feature";
import type { PdfNode } from "../../types/internal";
import { layoutSection, prepareSectionPage } from "./layout-section";
import { preprocessSection, type SectionPreprocessContext } from "./preprocess-section";
import type {
	LayoutSectionNode,
	MeasuredSectionNode,
	PreprocessedSectionNode,
} from "./section.types";

type SectionFeatureStages = NodeFeatureStages & {
	preprocessNode: PdfNode;
	preprocessedNode: PreprocessedSectionNode;
	measuredNode: MeasuredSectionNode;
	layoutNode: LayoutSectionNode;
	preprocessContext: SectionPreprocessContext;
	measureContext: NodeMeasureContext;
	layoutContext: NodeLayoutContext;
};

type SectionFeature = NodeFeature<SectionFeatureStages> & {
	readonly kind: "section";
	preprocess(node: PdfNode, context: SectionPreprocessContext): PreprocessedSectionNode;
	isUnstyled(node: object): boolean;
	measure(node: MeasuredSectionNode, context: NodeMeasureContext): MeasuredSectionNode;
	layout(node: LayoutSectionNode, context: NodeLayoutContext): void;
	preparePage(node: LayoutSectionNode, context: NodeLayoutContext): void;
	establishesFirstPage(): boolean;
};

export const sectionFeature = {
	kind: "section",
	contentKeys: ["section"],
	matches(node): boolean {
		return Boolean(node.section);
	},
	preprocess: preprocessSection,
	/**
	 * A section's properties configure its pages: none of them, `style` included, styles its
	 * content. This applies to any node with a `section` property, even one that is not a section.
	 */
	isUnstyled(node): boolean {
		return (node as { section?: unknown }).section !== undefined;
	},
	measure(node, context): MeasuredSectionNode {
		node.section = context.measureNode(node.section);
		return node;
	},
	layout(node, context): void {
		layoutSection(node, {
			writer: context.writer,
			defaultPageSize: context.pageSize,
			defaultPageMargins: context.pageMargins,
			processNode: (item) => context.processNode(item),
		});
	},
	/** A section starts on a page with its own settings. */
	establishesFirstPage(): boolean {
		return true;
	},
	preparePage(node, context): void {
		prepareSectionPage(node, {
			writer: context.writer,
			defaultPageSize: context.pageSize,
			defaultPageMargins: context.pageMargins,
		});
	},
} satisfies SectionFeature;
