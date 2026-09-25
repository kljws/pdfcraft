import type PageElementWriter from "../../layout/element-writer.page";
import type PDFDocument from "../../rendering/pdf-document";
import type StyleContextStack from "../../services/styles/style-context-stack";
import type DocumentContext from "../../document/document-context";
import type { Dictionary, PageOrientation, PdfCraftExtensions } from "../../types";
import type {
	MeasurePdfNode,
	MeasuredPdfNode,
	LayoutPdfNode,
	PageMarginSource,
	PageSize,
	PreprocessedPdfNode,
	TableLayout,
	CurrentPosition,
	Vector,
} from "../../types/internal";

export interface FeatureItemWriter {
	context(): DocumentContext;
	getCurrentPositionOnPage(): CurrentPosition;
	addVector(
		vector: Vector,
		ignoreContextX?: boolean,
		ignoreContextY?: boolean,
		index?: number,
		forcePage?: number,
	): CurrentPosition | undefined;
}

export interface NodePlaceContext {
	readonly writer: FeatureItemWriter;
	readonly index?: number;
}

export type NodePlaceResult = CurrentPosition | false | Array<CurrentPosition | undefined>;
export type NodePlaceHook = (node: LayoutPdfNode, context: NodePlaceContext) => NodePlaceResult;

export interface NodeMeasureContext {
	readonly document: PDFDocument;
	readonly styles: StyleContextStack;
	readonly extensions: PdfCraftExtensions;
	readonly tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>;
	readonly featureState: Map<string, object>;
	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode;
}

export type NodeMeasureHook<Context extends NodeMeasureContext = NodeMeasureContext> = (
	node: MeasurePdfNode,
	context: Context,
) => MeasuredPdfNode | undefined;

export interface NodeLayoutContext {
	readonly writer: PageElementWriter;
	readonly pageMargins: PageMarginSource;
	readonly pageSize: PageSize;
	readonly suppressLinearNodeList: boolean;
	nestedLevel: number;
	processNode(node: LayoutPdfNode, isVerticalAlignmentAllowed?: boolean): void;
	snakingAwarePageBreak(pageOrientation?: PageOrientation): void;
	moveDownWithPageBreak(height: number, pageOrientation?: PageOrientation): void;
}

export type NodeLayoutHook<Context extends NodeLayoutContext = NodeLayoutContext> = (
	node: LayoutPdfNode,
	context: Context,
) => void;

/** Type map carried by a feature through every node lifecycle stage. */
export interface NodeFeatureStages {
	preprocessNode: object;
	preprocessedNode: object;
	measuredNode: object;
	layoutNode: object;
	renderNode: object;
	preprocessContext: object | undefined;
	measureContext: object | undefined;
	layoutContext: object | undefined;
	renderContext: object | undefined;
	resourceSource?: object;
	resolvedResources?: object | undefined;
	resolveResourcesContext?: object | undefined;
	pageItem?: object;
	inline?: object;
}

type OptionalStage<Stages, Name extends PropertyKey> = Name extends keyof Stages
	? Stages[Name]
	: never;
type StageOr<Stages, Name extends PropertyKey, Fallback> = Name extends keyof Stages
	? Stages[Name]
	: Fallback;

export interface NodeFeature<Stages extends NodeFeatureStages> {
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
	render?(node: Stages["renderNode"], context: Stages["renderContext"]): void;
	decorate?(node: Stages["layoutNode"]): void;
	reset?(node: Stages["layoutNode"]): void;
	readonly inline?: OptionalStage<Stages, "inline">;
}
