import type { SvgToPdfOptions } from "../../types";

export type SvgRendererModule = Record<string, unknown>;

export interface SvgRendererRuntime extends Record<string, unknown> {
	doc: object;
	svg: unknown;
	x?: number;
	y?: number;
	options: SvgToPdfOptions;
	NamedColors: Record<string, number[]>;
	DefaultColors: Record<string, unknown>;
	Entities: Record<string, number>;
	PathArguments: Record<string, number>;
	PathFlags: Record<string, boolean>;
	Properties: Record<string, unknown>;
	pxToPt: number;
	viewportWidth: number;
	viewportHeight: number;
	preserveAspectRatio: string | null;
	useCSS: boolean;
	warningCallback: (warning: string) => void;
	fontCallback: (...parameters: unknown[]) => unknown;
	imageCallback: (...parameters: unknown[]) => unknown;
	colorCallback: ((...parameters: unknown[]) => unknown) | null;
	documentCallback: ((...parameters: unknown[]) => unknown) | null;
	precision: number;
	groupStack: unknown[];
	documentCache: Record<string, unknown>;
	links: unknown[];
	styleRules: unknown[];
}

export type SvgRendererInstaller = (runtime: SvgRendererRuntime) => SvgRendererModule;
