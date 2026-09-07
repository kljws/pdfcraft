import type { VirtualFileSystem } from "./resource.types";

export type ExtensionNode = Record<string, unknown>;

export type ExtensionResourceReference = string | { url: string; headers?: Record<string, string> };

export interface ExtensionMeasureContext {
	documentDefinition: ExtensionNode;
	virtualFileSystem: VirtualFileSystem | null;
	getStyle(property: string): unknown;
	measureBox(dimensions: { width: number; height: number }): void;
}

export interface ExtensionRenderContext {
	document: object;
	node: ExtensionNode;
	resolveFont(family: string, bold: boolean, italic: boolean, fallback: string): string;
}

export interface PdfCraftExtension {
	name: string;
	pageBreakKeys?: readonly string[];
	test(node: Readonly<ExtensionNode>): boolean;
	resolveResources?(
		documentDefinition: ExtensionNode,
		resolve: (resource: ExtensionResourceReference) => string,
	): void;
	measure(node: ExtensionNode, context: ExtensionMeasureContext): void;
	render?(context: ExtensionRenderContext): void;
}

export type PdfCraftExtensions = readonly PdfCraftExtension[];
