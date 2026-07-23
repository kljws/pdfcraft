import type {
	Alignment,
	Color,
	Decoration,
	ListType,
	Margin,
	PageBreak,
	PageOrientation,
	PageSize,
	PageSizeName,
} from "./common.types";

export interface Style {
	extends?: string | string[];
	font?: string;
	fontSize?: number;
	bold?: boolean;
	italics?: boolean;
	alignment?: Alignment;
	tableAlignment?: Exclude<Alignment, "justify">;
	color?: Color;
	background?: Color;
	decoration?: Decoration | Decoration[];
	decorationColor?: Color;
	decorationStyle?: "dashed" | "dotted" | "double" | "wavy";
	decorationThickness?: number;
	lineHeight?: number;
	paragraphGap?: number;
	characterSpacing?: number;
	columnGap?: number;
	leadingIndent?: number;
	noWrap?: boolean;
	wordBreak?: "normal" | "break-all";
	preserveLeadingSpaces?: boolean;
	preserveTrailingSpaces?: boolean;
	fontFeatures?: string[];
	opacity?: number;
	markerColor?: Color;
	border?: [boolean, boolean, boolean, boolean];
	borderColor?: [Color, Color, Color, Color];
	fillColor?: Color;
	fillOpacity?: number;
	margin?: Margin;
	marginLeft?: number;
	marginTop?: number;
	marginRight?: number;
	marginBottom?: number;
	link?: string;
	linkToPage?: number;
	linkToDestination?: string;
	linkToFile?: string | { src: string | Uint8Array; name?: string; description?: string };
	sup?: boolean;
	sub?: boolean;
}

export interface ContentBase extends Style {
	style?: string | string[] | Style;
	id?: string;
	pageBreak?: PageBreak;
	pageOrientation?: PageOrientation;
	absolutePosition?: { x: number; y: number };
	relativePosition?: { x: number; y: number };
	unbreakable?: boolean;
	headlineLevel?: number;
	tocItem?: string | string[];
	tocStyle?: string | string[] | Style;
	tocMargin?: Margin;
	tocNumberStyle?: string | string[] | Style;
	pageReference?: string;
	textReference?: string;
	outline?: boolean | string;
	outlineExpanded?: boolean;
	outlineParentId?: string;
	outlineText?: string;
	listType?: ListType;
	counter?: number;
}

export type Text =
	| string
	| number
	| boolean
	| TextNode
	| InlineImageNode
	| AcroFormNode
	| Array<string | number | boolean | TextNode | InlineImageNode | AcroFormNode>;

export interface TextNode extends ContentBase {
	text: Text;
	maxHeight?: number;
}

export interface InlineImageNode extends ContentBase {
	image: string | Uint8Array;
	width?: number;
	height?: number;
	fit?: [number, number];
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	maxHeight?: number;
	opacity?: number;
}

export type AcroFormType = "text" | "button" | "list" | "combo" | "checkbox";

export interface AcroFormOptions extends Record<string, unknown> {
	value?: string;
	defaultValue?: string;
	select?: string[];
	align?: "left" | "center" | "right";
	multiline?: boolean;
	password?: boolean;
	readOnly?: boolean;
	required?: boolean;
	selected?: boolean;
	backgroundColor?: Color;
	borderColor?: Color;
	fontSize?: number;
	format?: Record<string, unknown> & { type: string };
}

export interface AcroFormDefinition {
	type: AcroFormType;
	id: string;
	options?: AcroFormOptions;
}

export interface AcroFormNode extends ContentBase {
	acroform: AcroFormDefinition;
	width?: number | "*";
	height?: number;
}

export interface StackNode extends ContentBase {
	stack: Content[];
}

export interface ColumnsNode extends ContentBase {
	columns: Array<Content | Column>;
	columnGap?: number;
	snakingColumns?: boolean;
}

export interface Column extends ContentBase {
	width?: number | "auto" | "*" | "star" | `${number}%`;
	text?: Text;
	stack?: Content[];
}

export interface ListNode extends ContentBase {
	ul?: Content[];
	ol?: Content[];
	type?: ListType;
	start?: number;
	reversed?: boolean;
	separator?: string | [string, string];
}

export interface TableCell extends ContentBase {
	text?: Text;
	stack?: Content[];
	colSpan?: number;
	rowSpan?: number;
	border?: [boolean, boolean, boolean, boolean];
	borderColor?: [Color, Color, Color, Color];
	fillColor?: Color;
	fillOpacity?: number;
	verticalAlignment?: "top" | "middle" | "bottom";
}

export type TableCellDefinition = Content | TableCell;

export interface TableDefinition {
	body: TableCellDefinition[][];
	widths?: Array<number | "auto" | "*" | "star" | `${number}%`> | number | "auto" | "*" | "star";
	heights?: number | "auto" | Array<number | "auto"> | ((row: number) => number | "auto");
	headerRows?: number;
	keepWithHeaderRows?: number;
	dontBreakRows?: boolean;
}

export interface TableNode extends ContentBase {
	table: TableDefinition;
	layout?: string | TableLayout;
}

export interface TableLayout {
	hLineWidth?: (index: number, node: TableNode) => number;
	vLineWidth?: (index: number, node: TableNode) => number;
	hLineColor?: Color | ((index: number, node: TableNode, columnIndex?: number) => Color);
	vLineColor?: Color | ((index: number, node: TableNode, rowIndex?: number) => Color);
	paddingLeft?: (index: number, node: TableNode) => number;
	paddingRight?: (index: number, node: TableNode) => number;
	paddingTop?: (index: number, node: TableNode) => number;
	paddingBottom?: (index: number, node: TableNode) => number;
	hLineStyle?: (index: number, node: TableNode) => { dash?: CanvasVector["dash"] } | null;
	vLineStyle?: (index: number, node: TableNode) => { dash?: CanvasVector["dash"] } | null;
	hLineWhenBroken?: boolean;
	fillColor?:
		| Color
		| null
		| ((rowIndex: number, node: TableNode, columnIndex: number) => Color | null | undefined);
	fillOpacity?:
		number | ((rowIndex: number, node: TableNode, columnIndex: number) => number | undefined);
	defaultBorder?: boolean;
}

export interface ImageNode extends ContentBase {
	image: string | Uint8Array;
	width?: number;
	height?: number;
	fit?: [number, number];
	cover?: {
		width: number;
		height: number;
		valign?: "top" | "center" | "bottom";
		align?: "left" | "center" | "right";
	};
	opacity?: number;
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	maxHeight?: number;
}

export interface SvgNode extends ContentBase {
	svg: string;
	width?: number;
	height?: number;
	fit?: [number, number];
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	maxHeight?: number;
	options?: Record<string, unknown>;
}

export interface QrNode extends ContentBase {
	qr: string;
	foreground?: Color;
	background?: Color;
	fit?: number;
	eccLevel?: "L" | "M" | "Q" | "H";
	mode?: "numeric" | "alphanumeric" | "octet";
	version?: number;
	mask?: number;
	padding?: number;
}

export interface CanvasVector {
	type: "line" | "rect" | "ellipse" | "polyline" | "path";
	x?: number;
	y?: number;
	x1?: number;
	y1?: number;
	x2?: number;
	y2?: number;
	w?: number;
	h?: number;
	r?: number;
	r1?: number;
	r2?: number;
	points?: Array<{ x: number; y: number }>;
	lineWidth?: number;
	lineColor?: Color;
	color?: Color;
	fillOpacity?: number;
	lineOpacity?: number;
	strokeOpacity?: number;
	dash?: { length: number; space?: number; phase?: number };
	d?: string;
	closePath?: boolean;
	linearGradient?: string[];
	lineCap?: "butt" | "round" | "square";
	lineJoin?: "miter" | "round" | "bevel";
}

export interface CanvasNode extends ContentBase {
	canvas: CanvasVector[];
}

export interface AttachmentNode extends ContentBase {
	attachment: string | { src: string | Uint8Array; name?: string; description?: string };
}

export interface TocDefinition {
	id?: string;
	title?: Content;
	textStyle?: string | string[] | Style;
	numberStyle?: string | string[] | Style;
	textMargin?: Margin;
	sortBy?: "title";
	sortLocale?: string;
	outlines?: boolean;
	hideEmpty?: boolean;
}

export interface TocNode extends ContentBase {
	toc: TocDefinition;
}

export type Watermark =
	| string
	| ({
			text: string;
			angle?: number;
			color?: Color;
			opacity?: number;
			bold?: boolean;
			italics?: boolean;
	  } & Style);

export interface SectionNode extends Omit<ContentBase, "background" | "pageOrientation"> {
	section: Content;
	pageSize?: PageSizeName | PageSize | "inherit";
	pageOrientation?: PageOrientation | "inherit";
	pageMargins?: Margin | "inherit";
	header?: DynamicContent | null;
	footer?: DynamicContent | null;
	background?: DynamicBackground | null;
	watermark?: Watermark | "inherit" | null;
}

export type ContentNode =
	| TextNode
	| StackNode
	| ColumnsNode
	| ListNode
	| TableNode
	| ImageNode
	| SvgNode
	| QrNode
	| CanvasNode
	| AttachmentNode
	| AcroFormNode
	| TocNode
	| SectionNode;

export type Content = string | number | boolean | ContentNode | Content[];

export type DynamicContent =
	| Content
	| ((currentPage: number, pageCount: number, pageSize: PageSize) => Content | null | undefined);

export type DynamicBackground =
	| Content
	| ((currentPage: number, pageSize: PageSize) => Content | null | undefined)
	| ((currentPage: number, pageCount: number, pageSize: PageSize) => Content | null | undefined);
