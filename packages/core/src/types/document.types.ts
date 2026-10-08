import type { Alignment, Color, Margin } from "./index";
import type { Point, Position } from "./layout.types";

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

export type NodeStyleValue = string | string[] | Metadata;

/**
 * A document node at any stage, with every property it may carry. Shared properties are declared
 * here; each feature adds its content key to `NodeHierarchy` and its own options to this interface
 * from its `*.types.ts`.
 */
export interface PdfNode extends NodeHierarchy<PdfNode> {
	[key: string]: unknown;

	// Public node options and styles used by several owners.
	style?: NodeStyleValue | undefined;
	id?: string | undefined;
	linkToDestination?: string | undefined;
	options?: Metadata | undefined;
	type?: string | undefined;
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
	borderColor?: [Color, Color, Color, Color] | undefined;
	fillColor?: Color | undefined;
	fillOpacity?: number | undefined;
	verticalAlignment?: "top" | "middle" | "bottom" | undefined;
	pageBreak?: string | undefined;
	pageOrientation?: "portrait" | "landscape" | undefined;
	absolutePosition?: Point | undefined;
	relativePosition?: Point | undefined;
	unbreakable?: boolean | undefined;
	outline?: boolean | string | undefined;
	font?: string | undefined;
	fontSize?: number | undefined;
	bold?: boolean | undefined;
	italics?: boolean | undefined;
	alignment?: Alignment | undefined;
	color?: Color | undefined;
	background?: Color | undefined;
	lineHeight?: number | undefined;
	paragraphGap?: number | undefined;
	characterSpacing?: number | undefined;
	noWrap?: boolean | null | undefined;
	margin?: Margin | undefined;
	marginLeft?: number | undefined;
	marginTop?: number | undefined;
	marginRight?: number | undefined;
	marginBottom?: number | undefined;
	link?: string | undefined;
	linkToPage?: number | undefined;
}

export type PreprocessedNodeState<Node = PdfNode> = {
	_kind?: string | undefined;
	_nodeRef?: Node | undefined;
	_textNodeRef?: Node | undefined;
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
	pageNumber?: number | undefined;
	x?: number | undefined;
	y?: number | undefined;
	resetXY?: (() => void) | undefined;
	__height?: number | undefined;
	_x?: number | undefined;
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
/**
 * Content keys of a node, typed with the node shape of each stage. Each feature adds its own key
 * from its `*.types.ts`.
 */
// Kept as an interface: it takes part in the recursive node types and breaks the cycle. Augmenting
// declarations must repeat the `Node` type parameter, which only they use.
// oxlint-disable-next-line no-unused-vars
export interface NodeHierarchy<Node> {}
type NodeHierarchyKey = keyof NodeHierarchy<unknown>;
type NodeDefinition = Omit<
	KnownPdfNode,
	PreprocessedNodeKey | MeasuredNodeKey | LayoutNodeKey | NodeHierarchyKey
>;

export type RawPdfNode = NodeDefinition & NodeHierarchy<RawPdfNode>;
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
 * shape of every lifecycle stage, so these unions never import a feature. A feature that emits
 * page items of its own kind also sets `pageItem: true`.
 */
export interface NodeKindRegistry {}

type NodeKindStages = {
	preprocessed: unknown;
	measure: unknown;
	measured: unknown;
	layout: unknown;
	pageItem?: true | undefined;
};

/** Kinds of the features that emit page items of their own (`FeaturePageItem`). */
export type PageItemNodeKind = {
	[Kind in keyof NodeKindRegistry]: NodeKindRegistry[Kind] extends { pageItem: true }
		? Kind
		: never;
}[keyof NodeKindRegistry];

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
