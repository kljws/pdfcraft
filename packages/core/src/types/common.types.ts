export type Dictionary<T = unknown> = Record<string, T>;

export type PageOrientation = "portrait" | "landscape";
export type PageBreak = "before" | "beforeOdd" | "beforeEven" | "after" | "afterOdd" | "afterEven";
export type Alignment = "left" | "center" | "right" | "justify";
export type Decoration = "underline" | "lineThrough" | "overline";
export type ListType =
	| "disc"
	| "circle"
	| "square"
	| "none"
	| "decimal"
	| "upper-alpha"
	| "lower-alpha"
	| "upper-roman"
	| "lower-roman";
export type Margin = number | [number, number] | [number, number, number, number];
export type Color = string | [string, string];
export type PdfSubset =
	| `PDF/A-1${"" | "a" | "b"}`
	| `PDF/A-2${"" | "a" | "b"}`
	| `PDF/A-3${"" | "a" | "b"}`;

export interface PageSize {
	width: number;
	height: number;
}

export interface ResolvedPageSize extends PageSize {
	orientation: PageOrientation;
}

export type PageSizeName =
	| "4A0"
	| "2A0"
	| "A0"
	| "A1"
	| "A2"
	| "A3"
	| "A4"
	| "A5"
	| "A6"
	| "A7"
	| "A8"
	| "A9"
	| "A10"
	| "B0"
	| "B1"
	| "B2"
	| "B3"
	| "B4"
	| "B5"
	| "B6"
	| "B7"
	| "B8"
	| "B9"
	| "B10"
	| "C0"
	| "C1"
	| "C2"
	| "C3"
	| "C4"
	| "C5"
	| "C6"
	| "C7"
	| "C8"
	| "C9"
	| "C10"
	| "RA0"
	| "RA1"
	| "RA2"
	| "RA3"
	| "RA4"
	| "SRA0"
	| "SRA1"
	| "SRA2"
	| "SRA3"
	| "SRA4"
	| "EXECUTIVE"
	| "FOLIO"
	| "LEGAL"
	| "LETTER"
	| "TABLOID";
