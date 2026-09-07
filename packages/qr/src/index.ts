import type { Color, ContentBase, PdfCraftExtension } from "@pdfcraft/core/types";
import qrEncoder from "./vendor/qr-encoder";

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

declare global {
	interface PdfCraftContentExtensionRegistry {
		qr: QrNode;
	}
}

export const qrExtension: PdfCraftExtension = {
	name: "qr",
	pageBreakKeys: ["qr"],
	test: (node) => typeof node.qr === "string",
	measure: (node, context) => {
		const measured = qrEncoder.measure(node as unknown as Parameters<typeof qrEncoder.measure>[0]);
		node.canvas = measured._canvas;
		context.measureBox({ width: measured._width!, height: measured._height! });
		node._minHeight = measured._height;
		node._maxHeight = measured._height;
	},
};
