import type { PdfFont } from "../../types/internal";

export type FontStyle = "normal" | "bold" | "italics" | "bolditalics";
export type FontFile = string | Uint8Array | ArrayBuffer;

export type EmbeddedFont = PdfFont & {
	encode?(text: string, features?: unknown): unknown;
	font: {
		postscriptName: string;
	};
};
