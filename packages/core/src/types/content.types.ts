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

export type Style = {
	extends?: string | readonly string[] | undefined;
	font?: string | undefined;
	fontSize?: number | undefined;
	bold?: boolean | undefined;
	italics?: boolean | undefined;
	alignment?: Alignment | undefined;
	tableAlignment?: Exclude<Alignment, "justify"> | undefined;
	color?: Color | undefined;
	background?: Color | undefined;
	decoration?: Decoration | readonly Decoration[] | undefined;
	decorationColor?: Color | undefined;
	decorationStyle?: "dashed" | "dotted" | "double" | "wavy" | undefined;
	decorationThickness?: number | undefined;
	lineHeight?: number | undefined;
	paragraphGap?: number | undefined;
	characterSpacing?: number | undefined;
	columnGap?: number | undefined;
	leadingIndent?: number | undefined;
	noWrap?: boolean | undefined;
	wordBreak?: "normal" | "break-all" | undefined;
	preserveLeadingSpaces?: boolean | undefined;
	preserveTrailingSpaces?: boolean | undefined;
	fontFeatures?: readonly string[] | undefined;
	opacity?: number | undefined;
	markerColor?: Color | undefined;
	border?: [boolean, boolean, boolean, boolean] | undefined;
	borderColor?: [Color, Color, Color, Color] | undefined;
	fillColor?: Color | undefined;
	fillOpacity?: number | undefined;
	margin?: Margin | undefined;
	marginLeft?: number | undefined;
	marginTop?: number | undefined;
	marginRight?: number | undefined;
	marginBottom?: number | undefined;
	link?: string | undefined;
	linkToPage?: number | undefined;
	linkToDestination?: string | undefined;
	linkToFile?:
		| string
		| { src: string | Uint8Array; name?: string | undefined; description?: string | undefined }
		| undefined;
	sup?: boolean | undefined;
	sub?: boolean | undefined;
};

export type ContentBase = Style & {
	style?: string | readonly string[] | Style | undefined;
	id?: string | undefined;
	pageBreak?: PageBreak | undefined;
	pageOrientation?: PageOrientation | undefined;
	absolutePosition?: { x: number; y: number } | undefined;
	relativePosition?: { x: number; y: number } | undefined;
	unbreakable?: boolean | undefined;
	headlineLevel?: number | undefined;
	tocItem?: string | readonly string[] | undefined;
	tocStyle?: string | readonly string[] | Style | undefined;
	tocMargin?: Margin | undefined;
	tocNumberStyle?: string | readonly string[] | Style | undefined;
	pageReference?: string | undefined;
	textReference?: string | undefined;
	outline?: boolean | string | undefined;
	outlineExpanded?: boolean | undefined;
	outlineParentId?: string | undefined;
	outlineText?: string | undefined;
	listType?: ListType | undefined;
	counter?: number | undefined;
};

export type Text =
	| string
	| number
	| boolean
	| TextNode
	| InlineImageNode
	| AcroFormNode
	| readonly (string | number | boolean | TextNode | InlineImageNode | AcroFormNode)[];

export type TextNode = ContentBase & {
	text: Text;
	maxHeight?: number | undefined;
};

export type InlineImageNode = ContentBase & {
	image: string | Uint8Array;
	width?: number | undefined;
	height?: number | undefined;
	fit?: [number, number] | undefined;
	minWidth?: number | undefined;
	maxWidth?: number | undefined;
	minHeight?: number | undefined;
	maxHeight?: number | undefined;
	opacity?: number | undefined;
};

export type AcroFormType = "text" | "button" | "list" | "combo" | "checkbox";

export type AcroFormOptions = Record<string, unknown> & {
	value?: string | undefined;
	defaultValue?: string | undefined;
	select?: readonly string[] | undefined;
	align?: "left" | "center" | "right" | undefined;
	multiline?: boolean | undefined;
	password?: boolean | undefined;
	readOnly?: boolean | undefined;
	required?: boolean | undefined;
	selected?: boolean | undefined;
	backgroundColor?: Color | undefined;
	borderColor?: Color | undefined;
	fontSize?: number | undefined;
	format?: (Record<string, unknown> & { type: string }) | undefined;
};

export type AcroFormDefinition = {
	type: AcroFormType;
	id: string;
	options?: AcroFormOptions | undefined;
};

export type AcroFormNode = ContentBase & {
	acroform: AcroFormDefinition;
	width?: number | "*" | undefined;
	height?: number | undefined;
};

export type StackNode = Omit<ContentBase, "borderColor"> & {
	stack: readonly Content[];
	borderRadius?: number | undefined;
	borderWidth?: number | undefined;
	borderColor?: Color | undefined;
	backgroundColor?: Color | undefined;
	padding?: Margin | undefined;
};

export type ColumnsNode = ContentBase & {
	columns: readonly (Content | Column)[];
	columnGap?: number | undefined;
	snakingColumns?: boolean | undefined;
};

export type Column = ContentBase & {
	width?: number | "auto" | "*" | "star" | `${number}%` | undefined;
	text?: Text | undefined;
	stack?: readonly Content[] | undefined;
};

type ListNodeBase = ContentBase & {
	type?: ListType | undefined;
	start?: number | undefined;
	reversed?: boolean | undefined;
	separator?: string | [string, string] | undefined;
};

export type ListNode = ListNodeBase &
	(
		| { ul: readonly Content[]; ol?: never | undefined }
		| { ol: readonly Content[]; ul?: never | undefined }
	);

export type TableChrome = {
	colSpan?: number | undefined;
	rowSpan?: number | undefined;
	border?: [boolean, boolean, boolean, boolean] | undefined;
	borderColor?: [Color, Color, Color, Color] | undefined;
	fillColor?: Color | undefined;
	fillOpacity?: number | undefined;
	verticalAlignment?: "top" | "middle" | "bottom" | undefined;
};

export type TableCell = Content & TableChrome;

export type TableCellDefinition = Content | TableCell;

export type TableRow = readonly TableCellDefinition[];

export type TableHeaderDefinition = {
	rows: readonly TableRow[];
	layout?: string | TableLayout | undefined;
};

export type TableRowGroup = {
	rows: readonly TableRow[];
	keepTogether?: boolean | undefined;
	dontBreakRows?: boolean | undefined;
	layout?: TableRowGroupLayout | undefined;
};

export type TableRowGroupLayoutContext = {
	groupIndex: number;
	rowCount: number;
	startRow: number;
	endRow: number;
};

export type TableRowGroupLayout = {
	hLineWidth?:
		| ((boundaryIndex: number, node: TableLayoutNode, group: TableRowGroupLayoutContext) => number)
		| undefined;
	vLineWidth?:
		| ((columnIndex: number, node: TableLayoutNode, group: TableRowGroupLayoutContext) => number)
		| undefined;
	hLineColor?:
		| Color
		| ((
				boundaryIndex: number,
				node: TableLayoutNode,
				columnIndex: number | undefined,
				group: TableRowGroupLayoutContext,
		  ) => Color)
		| undefined;
	vLineColor?:
		| Color
		| ((
				columnIndex: number,
				node: TableLayoutNode,
				rowIndex: number | undefined,
				group: TableRowGroupLayoutContext,
		  ) => Color)
		| undefined;
	paddingLeft?:
		| ((columnIndex: number, node: TableLayoutNode, group: TableRowGroupLayoutContext) => number)
		| undefined;
	paddingRight?:
		| ((columnIndex: number, node: TableLayoutNode, group: TableRowGroupLayoutContext) => number)
		| undefined;
	paddingTop?:
		| ((rowIndex: number, node: TableLayoutNode, group: TableRowGroupLayoutContext) => number)
		| undefined;
	paddingBottom?:
		| ((rowIndex: number, node: TableLayoutNode, group: TableRowGroupLayoutContext) => number)
		| undefined;
	hLineStyle?:
		| ((
				boundaryIndex: number,
				node: TableLayoutNode,
				group: TableRowGroupLayoutContext,
		  ) => { dash?: CanvasVector["dash"] | undefined } | null)
		| undefined;
	vLineStyle?:
		| ((
				columnIndex: number,
				node: TableLayoutNode,
				group: TableRowGroupLayoutContext,
		  ) => { dash?: CanvasVector["dash"] | undefined } | null)
		| undefined;
};

export type TableBodyDefinition = {
	groups: readonly TableRowGroup[];
	layout?: string | TableLayout | undefined;
};

export type TableDefinition = {
	header?: TableHeaderDefinition | undefined;
	body: TableBodyDefinition;
	borderRadius?: number | undefined;
	widths?:
		| readonly (number | "auto" | "*" | "star" | `${number}%`)[]
		| number
		| "auto"
		| "*"
		| "star"
		| undefined;
	heights?:
		| number
		| "auto"
		| readonly (number | "auto")[]
		| ((row: number) => number | "auto")
		| undefined;
};

export type TableLayoutDefinition = {
	body: readonly TableRow[];
	widths: readonly (number | "auto" | "*" | "star" | `${number}%`)[];
	heights?:
		| number
		| "auto"
		| readonly (number | "auto")[]
		| ((row: number) => number | "auto")
		| undefined;
	headerRows: number;
};

export type TableLayoutNode = Omit<TableNode, "table"> & {
	table: TableLayoutDefinition;
};

export type TableNode = ContentBase & {
	table: TableDefinition;
};

export type TableLayout = {
	hLineWidth?: ((index: number, node: TableLayoutNode) => number) | undefined;
	vLineWidth?: ((index: number, node: TableLayoutNode) => number) | undefined;
	hLineColor?:
		| Color
		| ((index: number, node: TableLayoutNode, columnIndex?: number) => Color)
		| undefined;
	vLineColor?:
		| Color
		| ((index: number, node: TableLayoutNode, rowIndex?: number) => Color)
		| undefined;
	paddingLeft?: ((index: number, node: TableLayoutNode) => number) | undefined;
	paddingRight?: ((index: number, node: TableLayoutNode) => number) | undefined;
	paddingTop?: ((index: number, node: TableLayoutNode) => number) | undefined;
	paddingBottom?: ((index: number, node: TableLayoutNode) => number) | undefined;
	hLineStyle?:
		| ((index: number, node: TableLayoutNode) => { dash?: CanvasVector["dash"] | undefined } | null)
		| undefined;
	vLineStyle?:
		| ((index: number, node: TableLayoutNode) => { dash?: CanvasVector["dash"] | undefined } | null)
		| undefined;
	hLineWhenBroken?: boolean | undefined;
	fillColor?:
		| Color
		| null
		| ((rowIndex: number, node: TableLayoutNode, columnIndex: number) => Color | null | undefined)
		| undefined;
	fillOpacity?:
		| number
		| ((rowIndex: number, node: TableLayoutNode, columnIndex: number) => number | undefined)
		| undefined;
	defaultBorder?: boolean | undefined;
};

export type ImageNode = Omit<ContentBase, "borderColor"> & {
	image: string | Uint8Array;
	width?: number | undefined;
	height?: number | undefined;
	fit?: [number, number] | undefined;
	cover?:
		| {
				width: number;
				height: number;
				valign?: "top" | "center" | "bottom" | undefined;
				align?: "left" | "center" | "right" | undefined;
		  }
		| undefined;
	opacity?: number | undefined;
	minWidth?: number | undefined;
	maxWidth?: number | undefined;
	minHeight?: number | undefined;
	maxHeight?: number | undefined;
	borderRadius?: number | undefined;
	borderWidth?: number | undefined;
	borderColor?: Color | undefined;
	/**
	 * Opt-in: when the sized image cannot fit the content area of a fresh page or column, scale
	 * it down proportionally to fit that area instead of letting it overflow. Applied after
	 * `width`, `height`, `fit` and the min/max options. It never enlarges an image and is ignored
	 * for `cover` and `absolutePosition`.
	 */
	shrinkToFit?: boolean | undefined;
};

export type CanvasVector = {
	type: "line" | "rect" | "ellipse" | "polyline" | "path";
	x?: number | undefined;
	y?: number | undefined;
	x1?: number | undefined;
	y1?: number | undefined;
	x2?: number | undefined;
	y2?: number | undefined;
	w?: number | undefined;
	h?: number | undefined;
	r?: number | undefined;
	r1?: number | undefined;
	r2?: number | undefined;
	points?: readonly { x: number; y: number }[] | undefined;
	lineWidth?: number | undefined;
	lineColor?: Color | undefined;
	color?: Color | undefined;
	fillOpacity?: number | undefined;
	lineOpacity?: number | undefined;
	strokeOpacity?: number | undefined;
	dash?: { length: number; space?: number | undefined; phase?: number | undefined } | undefined;
	d?: string | undefined;
	closePath?: boolean | undefined;
	linearGradient?: readonly string[] | undefined;
	lineCap?: "butt" | "round" | "square" | undefined;
	lineJoin?: "miter" | "round" | "bevel" | undefined;
};

export type CanvasNode = ContentBase & {
	canvas: readonly CanvasVector[];
};

export type AttachmentNode = ContentBase & {
	attachment:
		| string
		| { src: string | Uint8Array; name?: string | undefined; description?: string | undefined };
};

export type TocDefinition = {
	id?: string | undefined;
	title?: Content | undefined;
	textStyle?: string | readonly string[] | Style | undefined;
	numberStyle?: string | readonly string[] | Style | undefined;
	textMargin?: Margin | undefined;
	sortBy?: "title" | undefined;
	sortLocale?: string | undefined;
	outlines?: boolean | undefined;
	hideEmpty?: boolean | undefined;
};

export type TocNode = ContentBase & {
	toc: TocDefinition;
};

export type Watermark =
	| string
	| ({
			text: string;
			angle?: number | undefined;
			color?: Color | undefined;
			opacity?: number | undefined;
			bold?: boolean | undefined;
			italics?: boolean | undefined;
	  } & Style);

export type SectionNode = Omit<ContentBase, "background" | "pageOrientation"> & {
	section: Content;
	pageSize?: PageSizeName | PageSize | "inherit" | undefined;
	pageOrientation?: PageOrientation | "inherit" | undefined;
	pageMargins?: Margin | "inherit" | undefined;
	header?: DynamicContent | null | undefined;
	footer?: DynamicContent | null | undefined;
	background?: DynamicBackground | null | undefined;
	watermark?: Watermark | "inherit" | null | undefined;
};

declare global {
	interface PdfCraftContentExtensionRegistry {}
}

export type ExtensionContentNode =
	PdfCraftContentExtensionRegistry[keyof PdfCraftContentExtensionRegistry];

export type ContentNode =
	| TextNode
	| StackNode
	| ColumnsNode
	| ListNode
	| TableNode
	| ImageNode
	| CanvasNode
	| AttachmentNode
	| AcroFormNode
	| TocNode
	| SectionNode
	| ExtensionContentNode;

export type Content = string | number | boolean | ContentNode | readonly Content[];

export type DynamicContent =
	| Content
	| ((currentPage: number, pageCount: number, pageSize: PageSize) => Content | null | undefined);

export type DynamicBackground =
	| Content
	| ((currentPage: number, pageSize: PageSize) => Content | null | undefined)
	| ((currentPage: number, pageCount: number, pageSize: PageSize) => Content | null | undefined);
