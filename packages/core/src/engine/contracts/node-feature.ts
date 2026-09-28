import type PageElementWriter from "../../layout/element-writer.page";
import type PDFDocument from "../../rendering/pdf-document";
import type StyleContextStack from "../../services/styles/style-context-stack";
import type DocumentContext from "../../document/document-context";
import type { Dictionary, PageOrientation, PdfCraftExtensions } from "../../types";
import type {
	CurrentPosition,
	LayoutPdfNode,
	MeasurePdfNode,
	MeasuredPdfNode,
	PageMarginSource,
	PageSize,
	PendingMeasureNode,
	TableLayout,
	Vector,
} from "../../types/internal";

export type FeatureItemWriter = {
	context(): DocumentContext;
	getCurrentPositionOnPage(): CurrentPosition;
	addVector(
		vector: Vector,
		ignoreContextX?: boolean,
		ignoreContextY?: boolean,
		index?: number,
		forcePage?: number,
	): CurrentPosition | undefined;
};

export type NodePlaceContext = {
	readonly writer: FeatureItemWriter;
	readonly index?: number | undefined;
	/** Set on the last attempt, after a fresh page or column: the item must be placed even if it overflows. */
	readonly allowOverflow?: boolean | undefined;
};

export type NodePlaceResult = CurrentPosition | false | Array<CurrentPosition | undefined>;
export type NodePlaceHook = (node: LayoutPdfNode, context: NodePlaceContext) => NodePlaceResult;

export type NodeMeasureContext = {
	readonly document: PDFDocument;
	readonly styles: StyleContextStack;
	readonly extensions: PdfCraftExtensions;
	readonly tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>;
	readonly featureState: Map<string, object>;
	measureNode(node: PendingMeasureNode): MeasuredPdfNode;
};

export type NodeMeasureHook<Context extends NodeMeasureContext = NodeMeasureContext> = (
	node: MeasurePdfNode,
	context: Context,
) => MeasuredPdfNode | undefined;

export type NodeLayoutContext = {
	readonly writer: PageElementWriter;
	readonly pageMargins: PageMarginSource;
	readonly pageSize: PageSize;
	readonly suppressLinearNodeList: boolean;
	nestedLevel: number;
	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void;
	snakingAwarePageBreak(pageOrientation?: PageOrientation): void;
	moveDownWithPageBreak(height: number, pageOrientation?: PageOrientation): void;
};

export type NodeLayoutHook<Context extends NodeLayoutContext = NodeLayoutContext> = (
	node: LayoutPdfNode,
	context: Context,
) => void;

/** Type map carried by a feature through every node lifecycle stage. */
export type NodeFeatureStages = {
	preprocessNode: object;
	preprocessedNode: object;
	measuredNode: object;
	layoutNode: object;
	/** Omitted by features that emit no page item of their own. */
	renderNode?: object | undefined;
	preprocessContext: object | undefined;
	measureContext: object | undefined;
	layoutContext: object | undefined;
	renderContext?: object | undefined;
	resourceSource?: object | undefined;
	resolvedResources?: object | undefined;
	resolveResourcesContext?: object | undefined;
	pageItem?: object | undefined;
	inline?: object | undefined;
};

type OptionalStage<Stages, Name extends PropertyKey> = Name extends keyof Stages
	? Stages[Name]
	: never;
type StageOr<Stages, Name extends PropertyKey, Fallback> = Name extends keyof Stages
	? Stages[Name]
	: Fallback;

export type NodeFeature<Stages extends NodeFeatureStages> = {
	readonly kind: string;
	matches(node: Stages["preprocessNode"]): boolean;
	preprocess?(
		node: Stages["preprocessNode"],
		context: Stages["preprocessContext"],
	): Stages["preprocessedNode"];
	resolveResources?(
		source: OptionalStage<Stages, "resourceSource">,
		context: OptionalStage<Stages, "resolveResourcesContext">,
	): OptionalStage<Stages, "resolvedResources">;
	measure?(
		node: StageOr<Stages, "measureNode", Stages["measuredNode"]>,
		context: Stages["measureContext"],
	): Stages["measuredNode"];
	layout?(node: Stages["layoutNode"], context: Stages["layoutContext"]): void;
	place?(node: Stages["layoutNode"], context: NodePlaceContext): NodePlaceResult;
	render?(
		node: OptionalStage<Stages, "renderNode">,
		context: OptionalStage<Stages, "renderContext">,
	): void;
	decorate?(node: Stages["layoutNode"]): void;
	reset?(node: Stages["layoutNode"]): void;
	readonly inline?: OptionalStage<Stages, "inline"> | undefined;
};
