import type { AcroFormDefinition, Alignment, Color, Decoration, Margin } from "./index";
import type { NodeLayoutInfo, Point, Position } from "./layout.types";
import type { Vector } from "./rendering.types";
import type { ColumnNode, PdfTable, RawTableWidths, TableLayout } from "./table.types";

export type Metadata = Record<string, unknown>;
export type Nullable<T> = T | null;
export type MaybePromise<T> = T | Promise<T>;

export type NodeText<Node = PdfNode> =
	| string
	| number
	| boolean
	| Node
	| NodeText<Node>[]
	| null
	| undefined;

export interface SerializedBuffer {
	type: "Buffer";
	data: number[];
}

export interface NodeReference<Node = PdfNode> {
	_nodeRef: Node;
	_textNodeRef?: Node;
	_pseudo?: boolean;
}

export interface TocDefinition<Node = PdfNode> {
	id?: string;
	title?: Node | null;
	_items: NodeReference<Node>[];
	_pseudo?: boolean;
	_table?: Node;
	textStyle?: NodeStyleValue;
	numberStyle?: NodeStyleValue;
	textMargin?: Margin;
	sortBy?: "title";
	sortLocale?: string;
	outlines?: boolean;
	hideEmpty?: boolean;
}

export type NodeStyleValue = string | string[] | Metadata;

export interface PdfNode {
	[key: string]: unknown;

	// Raw and preprocessed content variants.
	text?: NodeText;
	stack?: PdfNode[];
	columns?: ColumnNode[];
	ul?: PdfNode[];
	ol?: PdfNode[];
	table?: PdfTable;
	canvas?: Vector[];
	section?: PdfNode;
	image?: string | Uint8Array | SerializedBuffer;
	attachment?: string | AttachmentSource;
	acroform?: AcroFormDefinition;
	toc?: TocDefinition;

	// Public node options and styles used internally.
	style?: NodeStyleValue;
	id?: string;
	tocItem?: string | string[];
	tocStyle?: NodeStyleValue;
	tocMargin?: Margin;
	tocNumberStyle?: NodeStyleValue;
	pageReference?: string;
	textReference?: string;
	linkToDestination?: string;
	linkToFile?: string | AttachmentSource;
	icon?: string;
	options?: Metadata;
	type?: string;
	listType?: string;
	start?: number;
	counter?: number;
	reversed?: boolean;
	separator?: string | [string, string];
	width?: number | string;
	height?: number | "auto";
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	maxHeight?: number;
	fit?: [number, number] | number;
	cover?: ImageCover;
	opacity?: number;
	borderRadius?: number;
	borderWidth?: number;
	backgroundColor?: Color;
	_imageBorderColor?: Color;
	colSpan?: number;
	rowSpan?: number;
	border?: [boolean, boolean, boolean, boolean];
	borderColor?: [Color, Color, Color, Color];
	fillColor?: Color;
	fillOpacity?: number;
	overlayPattern?: PDFKit.Mixins.ColorValue;
	overlayOpacity?: number;
	verticalAlignment?: "top" | "middle" | "bottom";
	layout?: string | TableLayout;
	pageBreak?: string;
	pageBreakCalculated?: boolean;
	pageOrientation?: "portrait" | "landscape";
	absolutePosition?: Point;
	relativePosition?: Point;
	unbreakable?: boolean;
	headlineLevel?: number;
	outline?: boolean | string;
	outlineExpanded?: boolean;
	outlineParentId?: string;
	outlineText?: string;
	font?: string;
	fontSize?: number;
	bold?: boolean;
	italics?: boolean;
	alignment?: Alignment;
	tableAlignment?: "left" | "center" | "right";
	color?: Color;
	background?: Color;
	decoration?: Decoration | Decoration[];
	decorationColor?: Color;
	decorationStyle?: string;
	decorationThickness?: number;
	lineHeight?: number;
	paragraphGap?: number;
	characterSpacing?: number;
	leadingIndent?: number;
	noWrap?: boolean | null;
	wordBreak?: "normal" | "break-all";
	preserveLeadingSpaces?: boolean;
	preserveTrailingSpaces?: boolean;
	margin?: Margin;
	marginLeft?: number;
	marginTop?: number;
	marginRight?: number;
	marginBottom?: number;
	link?: string;
	linkToPage?: number;
	sup?: boolean;
	sub?: boolean;
	markerColor?: Color;
	columnGap?: number;
	snakingColumns?: boolean;
	padding?: Margin;
}

export interface PreprocessedNodeState<Node = PdfNode> {
	_kind?: string;
	_nodeRef?: Node;
	_textNodeRef?: Node;
	_tocItemRef?: Node;
	_pseudo?: boolean;
}

export interface MeasuredNodeState {
	_margin?: [number, number, number, number] | null;
	_paragraphGap?: number;
	_minWidth?: number;
	_maxWidth?: number;
	_minHeight?: number;
	_maxHeight?: number;
	_width?: number;
	_height?: number;
	_alignment?: Alignment;
}

export interface LayoutNodeState<Node = PdfNode> {
	_node?: Node;
	_position?: Position;
	positions?: Position[];
	nodeInfo?: NodeLayoutInfo;
	pageNumber?: number;
	x?: number;
	y?: number;
	resetXY?: () => void;
	__height?: number;
	_x?: number;
	// Vertical-alignment box state, filled by the container that aligns its content.
	getNodeHeight?: () => number;
	getViewHeight?: () => number;
	nodeHeight?: number;
	cell?: Node;
	isCellContentMultiPage?: boolean;
}

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
interface NodeHierarchy<Node, TableWidths = RawTableWidths> {
	text?: NodeText<Node>;
	stack?: Node[];
	columns?: ColumnNode<Node>[];
	ul?: Node[];
	ol?: Node[];
	table?: PdfTable<Node, TableWidths>;
	section?: Node;
	toc?: TocDefinition<Node>;
}
type NodeDefinition = Omit<
	KnownPdfNode,
	PreprocessedNodeKey | MeasuredNodeKey | LayoutNodeKey | NodeHierarchyKey
>;

export type RawPdfNode = NodeDefinition &
	NodeHierarchy<RawPdfNode> &
	Pick<KnownPdfNode, "canvas" | "image" | "attachment" | "acroform">;
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

interface NodeKindStages {
	preprocessed: unknown;
	measure: unknown;
	measured: unknown;
	layout: unknown;
}

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

export interface ImageCover {
	width: number;
	height: number;
	align?: "left" | "center" | "right";
	valign?: "top" | "center" | "bottom";
}

export interface AttachmentSource extends Metadata {
	src: string | Uint8Array | ArrayBuffer;
	name?: string;
	description?: string;
}
