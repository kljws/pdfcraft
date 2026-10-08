import type {
	CreatePdfOptions,
	Dictionary,
	DocumentDefinition,
	ResourceHeaders,
	TableLayout,
} from "../types";

export type PrinterOptions = CreatePdfOptions & {
	fontLayoutCache?: boolean | undefined;
	bufferPages?: boolean | undefined;
	tableLayouts?: Dictionary<TableLayout> | undefined;
};

export type PdfKitCreationOptions = Omit<PDFKit.PDFDocumentOptions, "font" | "size"> & {
	size: [number, number];
	pdfVersion: NonNullable<DocumentDefinition["version"]>;
	bufferPages: boolean;
	autoFirstPage: boolean;
	font: null;
};

export type ExtendedResource = {
	url: string;
	headers: ResourceHeaders;
};
