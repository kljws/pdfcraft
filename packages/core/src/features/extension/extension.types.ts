import type { ExtensionNode } from "../../types";
import type { LayoutNodeBase, MeasuredNodeBase, PreprocessedNodeBase } from "../../types/internal";

export type PreprocessedExtensionNode = PreprocessedNodeBase &
	ExtensionNode & { _kind: "extension" };

export type ExtensionMeasureNode = MeasuredNodeBase & ExtensionNode & { _kind: "extension" };

export type MeasuredExtensionNode = ExtensionMeasureNode & { _extension: string };

export type LayoutExtensionNode = LayoutNodeBase &
	ExtensionNode & { _kind: "extension"; _extension: string };

declare module "../../types/document.types" {
	interface NodeKindRegistry {
		extension: {
			preprocessed: PreprocessedExtensionNode;
			measure: ExtensionMeasureNode;
			measured: MeasuredExtensionNode;
			layout: LayoutExtensionNode;
		};
	}
}
