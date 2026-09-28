import type { AcroFormDefinition, Alignment, Color, Decoration, Margin } from "./index";
import type { NodeLayoutInfo, Point, Position } from "./layout.types";
import type { Vector } from "./rendering.types";
import type { ColumnNode, PdfTable, RawTableWidths, TableLayout } from "./table.types";

export type Metadata = Record<string, unknown>;

export type NodeText<Node = PdfNode> =
	| string
	| number
	| boolean
	| Node
	| NodeText<Node>[]
	| null
	| undefined;

export type SerializedBuffer = {
	type: "Buffer";
	data: number[];
};

export type NodeReference<Node = PdfNode> = {
	_nodeRef: Node;
	_textNodeRef?: Node | undefined;
	_pseudo?: boolean | undefined;
};

export type TocDefinition<Node = PdfNode> = {
	id?: string | undefined;
	title?: Node | null | undefined;
	_items: NodeReference<Node>[];
	_pseudo?: boolean | undefined;
	_table?: Node | undefined;
	textStyle?: NodeStyleValue | undefined;
	numberStyle?: NodeStyleValue | undefined;
	textMargin?: Margin | undefined;
	sortBy?: "title" | undefined;
	sortLocale?: string | undefined;
	outlines?: boolean | undefined;
	hideEmpty?: boolean | undefined;
};

export type NodeStyleValue = string | string[] | Metadata;

export type PdfNode = {
	[key: string]: unknown;

	// Raw and preprocessed content variants.
	text?: NodeText | undefined;
	stack?: PdfNode[] | undefined;
	columns?: ColumnNode[] | undefined;
	ul?: PdfNode[] | undefined;
	ol?: PdfNode[] | undefined;
	table?: PdfTable | undefined;
	canvas?: Vector[] | undefined;
	section?: PdfNode | undefined;
	image?: string | Uint8Array | SerializedBuffer | undefined;
	attachment?: string | AttachmentSource | undefined;
	acroform?: AcroFormDefinition | undefined;
	toc?: TocDefinition | undefined;

	// Public node options and styles used internally.
	style?: NodeStyleValue | undefined;
	id?: string | undefined;
	tocItem?: string | string[] | undefined;
	tocStyle?: NodeStyleValue | undefined;
	tocMargin?: Margin | undefined;
	tocNumberStyle?: NodeStyleValue | undefined;
	pageReference?: string | undefined;
	textReference?: string | undefined;
	linkToDestination?: string | undefined;
	linkToFile?: string | AttachmentSource | undefined;
	icon?: string | undefined;
	options?: Metadata | undefined;
	type?: string | undefined;
	listType?: string | undefined;
	start?: number | undefined;
	counter?: number | undefined;
	reversed?: boolean | undefined;
	separator?: string | [string, string] | undefined;
	width?: number | string | undefined;
	height?: number | "auto" | undefined;
	minWidth?: number | undefined;
	maxWidth?: number | undefined;
	minHeight?: number | undefined;
	maxHeight?: number | undefined;
	fit?: [number, number] | number | undefined;
	cover?: ImageCover | undefined;
	opacity?: number | undefined;
	borderRadius?: number | undefined;
	borderWidth?: number | undefined;
	backgroundColor?: Color | undefined;
	_imageBorderColor?: Color | undefined;
	colSpan?: number | undefined;
	rowSpan?: number | undefined;
	border?: [boolean, boolean, boolean, boolean] | undefined;
	borderColor?: [Color, Color, Color, Color] | undefined;
	fillColor?: Color | undefined;
	fillOpacity?: number | undefined;
	overlayPattern?: PDFKit.Mixins.ColorValue | undefined;
	overlayOpacity?: number | undefined;
	verticalAlignment?: "top" | "middle" | "bottom" | undefined;
	layout?: string | TableLayout | undefined;
	pageBreak?: string | undefined;
	pageBreakCalculated?: boolean | undefined;
	pageOrientation?: "portrait" | "landscape" | undefined;
	absolutePosition?: Point | undefined;
	relativePosition?: Point | undefined;
	unbreakable?: boolean | undefined;
	headlineLevel?: number | undefined;
	outline?: boolean | string | undefined;
	outlineExpanded?: boolean | undefined;
	outlineParentId?: string | undefined;
	outlineText?: string | undefined;
	font?: string | undefined;
	fontSize?: number | undefined;
	bold?: boolean | undefined;
	italics?: boolean | undefined;
	alignment?: Alignment | undefined;
	tableAlignment?: "left" | "center" | "right" | undefined;
	color?: Color | undefined;
	background?: Color | undefined;
	decoration?: Decoration | Decoration[] | undefined;
	decorationColor?: Color | undefined;
	decorationStyle?: string | undefined;
	decorationThickness?: number | undefined;
	lineHeight?: number | undefined;
	paragraphGap?: number | undefined;
	characterSpacing?: number | undefined;
	leadingIndent?: number | undefined;
	noWrap?: boolean | null | undefined;
	wordBreak?: "normal" | "break-all" | undefined;
	preserveLeadingSpaces?: boolean | undefined;
	preserveTrailingSpaces?: boolean | undefined;
	margin?: Margin | undefined;
	marginLeft?: number | undefined;
	marginTop?: number | undefined;
	marginRight?: number | undefined;
	marginBottom?: number | undefined;
	link?: string | undefined;
	linkToPage?: number | undefined;
	sup?: boolean | undefined;
	sub?: boolean | undefined;
	markerColor?: Color | undefined;
	columnGap?: number | undefined;
	snakingColumns?: boolean | undefined;
	padding?: Margin | undefined;
};

export type PreprocessedNodeState<Node = PdfNode> = {
	_kind?: string | undefined;
	_nodeRef?: Node | undefined;
	_textNodeRef?: Node | undefined;
	_tocItemRef?: Node | undefined;
	_pseudo?: boolean | undefined;
};

export type MeasuredNodeState = {
	_margin?: [number, number, number, number] | null | undefined;
	_paragraphGap?: number | undefined;
	_minWidth?: number | undefined;
	_maxWidth?: number | undefined;
	_minHeight?: number | undefined;
	_maxHeight?: number | undefined;
	_width?: number | undefined;
	_height?: number | undefined;
	_alignment?: Alignment | undefined;
};

export type LayoutNodeState<Node = PdfNode> = {
	_node?: Node | undefined;
	_position?: Position | undefined;
	positions?: Position[] | undefined;
	nodeInfo?: NodeLayoutInfo | undefined;
	pageNumber?: number | undefined;
	x?: number | undefined;
	y?: number | undefined;
	resetXY?: (() => void) | undefined;
	__height?: number | undefined;
	_x?: number | undefined;
	// Vertical-alignment box state, filled by the container that aligns its content.
	getNodeHeight?: (() => number) | undefined;
	getViewHeight?: (() => number) | undefined;
	nodeHeight?: number | undefined;
	cell?: Node | undefined;
	isCellContentMultiPage?: boolean | undefined;
};

type PreprocessedNodeKey = keyof PreprocessedNodeState;
type MeasuredNodeKey = keyof MeasuredNodeState;
type LayoutNodeKey = keyof LayoutNodeState;
type KnownNodeProperties<T> = {
	[
		Key in keyof T as string extends Key
			? never
			: number extends Key
				? never
				: symbol extends Key
					? never
					: Key
	]: T[Key];
};
type KnownPdfNode = KnownNodeProperties<PdfNode>;
type NodeHierarchyKey =
	| "text"
	| "stack"
	| "columns"
	| "ul"
	| "ol"
	| "table"
	| "section"
	| "toc"
	| "canvas"
	| "image"
	| "attachment"
	| "acroform";
// Kept as an interface: it takes part in the recursive node types and breaks the cycle.
interface NodeHierarchy<Node, TableWidths = RawTableWidths> {
	text?: NodeText<Node> | undefined;
	stack?: Node[] | undefined;
	columns?: ColumnNode<Node>[] | undefined;
	ul?: Node[] | undefined;
	ol?: Node[] | undefined;
	table?: PdfTable<Node, TableWidths> | undefined;
	section?: Node | undefined;
	toc?: TocDefinition<Node> | undefined;
}
type NodeDefinition = Omit<
	KnownPdfNode,
	PreprocessedNodeKey | MeasuredNodeKey | LayoutNodeKey | NodeHierarchyKey
>;

export type RawPdfNode = NodeDefinition &
	NodeHierarchy<RawPdfNode> &
	Pick<KnownPdfNode, "canvas" | "image" | "attachment" | "acroform">;
// The node bases stay interfaces: they refer to the node unions built from `NodeKindRegistry`,
// which refer back to them. Interface members resolve lazily and break that cycle; type aliases
// of intersections do not.
export interface PreprocessedNodeBase
	extends NodeDefinition, PreprocessedNodeState<PreprocessedPdfNode> {}

export interface MeasuredNodeBase
	extends NodeDefinition, PreprocessedNodeState<MeasuredPdfNode>, MeasuredNodeState {}

export interface LayoutNodeBase
	extends
		NodeDefinition,
		PreprocessedNodeState<LayoutPdfNode>,
		MeasuredNodeState,
		LayoutNodeState<LayoutPdfNode> {}

/**
 * Open registry of node kinds. Each feature augments it from its own `*.types.ts` with the node
 * shape of every lifecycle stage, so these unions never import a feature.
 */
export interface NodeKindRegistry {}

type NodeKindStages = {
	preprocessed: unknown;
	measure: unknown;
	measured: unknown;
	layout: unknown;
};

type NodeOfStage<Stage extends keyof NodeKindStages> = {
	[Kind in keyof NodeKindRegistry]: NodeKindRegistry[Kind] extends NodeKindStages
		? NodeKindRegistry[Kind][Stage]
		: never;
}[keyof NodeKindRegistry];

export type PreprocessedPdfNode = NodeOfStage<"preprocessed">;
/**
 * A child handed to measurement by its parent. Nodes are measured in place, so the child is
 * still preprocessed even though the parent's measured shape already types it as measured.
 */
export type PendingMeasureNode = PreprocessedPdfNode | MeasuredPdfNode;
export type MeasurePdfNode = NodeOfStage<"measure">;
export type MeasuredPdfNode = NodeOfStage<"measured">;
export type LayoutPdfNode = NodeOfStage<"layout">;

export type ImageCover = {
	width: number;
	height: number;
	align?: "left" | "center" | "right" | undefined;
	valign?: "top" | "center" | "bottom" | undefined;
};

export type AttachmentSource = Metadata & {
	src: string | Uint8Array | ArrayBuffer;
	name?: string | undefined;
	description?: string | undefined;
};
