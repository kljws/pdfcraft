import type { AcroFormDefinition, Alignment, Color, Decoration, Margin } from "./index";
import type {
	ContextSnapshot,
	EndingCell,
	NodeLayoutInfo,
	OutlineDefinition,
	PageBreak,
	Point,
	Position,
} from "./layout.types";
import type { Vector } from "./rendering.types";
import type {
	ColumnNode,
	ColumnWidth,
	PdfTable,
	RawTableWidths,
	TableLayout,
	TableOffsets,
} from "./table.types";
import type { Inline, ListMarker, PdfFont, TextMeasurement } from "./text.types";

export type Metadata = Record<string, unknown>;
export type Nullable<T> = T | null;
export type MaybePromise<T> = T | Promise<T>;

export type NodeText<Node = PdfNode> =
	string | number | boolean | Node | NodeText<Node>[] | null | undefined;

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
	svg?: string | SVGElement;
	qr?: string;
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
	foreground?: Color;
	eccLevel?: "L" | "M" | "Q" | "H";
	mode?: "numeric" | "alphanumeric" | "octet";
	version?: number;
	mask?: number;
	padding?: number;

	// Preprocessing references.
	_nodeRef?: PdfNode;
	_textNodeRef?: PdfNode;
	_tocItemRef?: PdfNode;
	_pageRef?: NodeReference;
	_textRef?: NodeReference;
	_pseudo?: boolean;

	// Measurement state.
	_margin?: [number, number, number, number] | null;
	_paragraphGap?: number;
	_minWidth?: number;
	_maxWidth?: number;
	_minHeight?: number;
	_maxHeight?: number;
	_width?: number;
	_height?: number;
	_alignment?: Alignment;
	_tableAlignment?: "left" | "center" | "right";
	_inlines?: Inline[];
	_gap?: number;
	_gapSize?: TextMeasurement;
	_offsets?: TableOffsets;
	_layout?: TableLayout;
	_span?: boolean;
	_colSpan?: number;
	_rowSpan?: number;
	listMarker?: ListMarker;
	positions?: Position[];
	pageBreaks?: PageBreak[];
	nodeInfo?: NodeLayoutInfo;

	// Layout state.
	_bottomY?: number;
	_originalXOffset?: number;
	_columnEndingContext?: ContextSnapshot;
	_endingCell?: EndingCell;
	_leftEndingCell?: EndingCell;
	_startingRowSpanY?: number;
	_startingRowSpanPage?: number;
	_rowTopPageY?: number;
	_breaksBySpan?: PageBreak[];
	_willBreak?: boolean;
	_outline?: OutlineDefinition;
	_isUnbreakableContext?: boolean;
	pageNumber?: number;
	x?: number;
	y?: number;
	resetXY?: () => void;
	getNodeHeight?: () => number;
	getViewHeight?: () => number;
	isCellContentMultiPage?: boolean;
	_bottomByPage?: Record<number, number>;
	viewHeight?: number;
	nodeHeight?: number;
	bottomY?: number;
	cell?: PdfNode;
	__height?: number;
	_rowTopPageYPadding?: number;
	_lastPageNumber?: number;
	_rowSpanCurrentOffset?: number;
	_x?: number;
	_canvas?: Vector[];
	_formFont?: PdfFont;
}

export interface PreprocessedNodeState<Node = PdfNode> {
	_nodeRef?: Node;
	_textNodeRef?: Node;
	_tocItemRef?: Node;
	_pageRef?: NodeReference<Node>;
	_textRef?: NodeReference<Node>;
	_pseudo?: boolean;
}

export interface MeasuredNodeState<Node = PdfNode> {
	_margin?: [number, number, number, number] | null;
	_paragraphGap?: number;
	_minWidth?: number;
	_maxWidth?: number;
	_minHeight?: number;
	_maxHeight?: number;
	_width?: number;
	_height?: number;
	_alignment?: Alignment;
	_tableAlignment?: "left" | "center" | "right";
	_inlines?: Inline[];
	_gap?: number;
	_gapSize?: TextMeasurement;
	_offsets?: TableOffsets;
	_layout?: TableLayout<Node>;
	_span?: boolean;
	_colSpan?: number;
	_rowSpan?: number;
	listMarker?: ListMarker;
}

export interface LayoutNodeState<Node = PdfNode> {
	_node?: Node;
	_position?: Position;
	positions?: Position[];
	pageBreaks?: PageBreak[];
	nodeInfo?: NodeLayoutInfo;
	_bottomY?: number;
	_originalXOffset?: number;
	_columnEndingContext?: ContextSnapshot;
	_endingCell?: EndingCell;
	_leftEndingCell?: EndingCell;
	_startingRowSpanY?: number;
	_startingRowSpanPage?: number;
	_rowTopPageY?: number;
	_breaksBySpan?: PageBreak[];
	_willBreak?: boolean;
	_outline?: OutlineDefinition;
	_isUnbreakableContext?: boolean;
	pageNumber?: number;
	x?: number;
	y?: number;
	resetXY?: () => void;
	getNodeHeight?: () => number;
	getViewHeight?: () => number;
	isCellContentMultiPage?: boolean;
	_bottomByPage?: Record<number, number>;
	viewHeight?: number;
	nodeHeight?: number;
	bottomY?: number;
	cell?: Node;
	__height?: number;
	_rowTopPageYPadding?: number;
	_lastPageNumber?: number;
	_rowSpanCurrentOffset?: number;
	_x?: number;
	_canvas?: Vector[];
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
type NodeHierarchyKey = "text" | "stack" | "columns" | "ul" | "ol" | "table" | "section" | "toc";
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

export type RawPdfNode = NodeDefinition & NodeHierarchy<RawPdfNode>;
export type PreprocessedPdfNode = NodeDefinition &
	NodeHierarchy<PreprocessedPdfNode> &
	PreprocessedNodeState<PreprocessedPdfNode>;
export type MeasuredPdfNode = NodeDefinition &
	NodeHierarchy<MeasuredPdfNode, ColumnWidth[]> &
	PreprocessedNodeState<MeasuredPdfNode> &
	MeasuredNodeState<MeasuredPdfNode>;
export type LayoutPdfNode = NodeDefinition &
	NodeHierarchy<LayoutPdfNode, ColumnWidth[]> &
	PreprocessedNodeState<LayoutPdfNode> &
	MeasuredNodeState<LayoutPdfNode> &
	LayoutNodeState<LayoutPdfNode>;

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
