import type { NodeLayoutContext } from "../engine/contracts/node-feature";
import type { VerticalAlignmentControls } from "../engine/layout-node-lifecycle";
import type { FlowAdvance, FlowAdvanceOptions } from "../engine/layout-pagination";
import type PageElementWriter from "../layout/element-writer.page";
import type { PageOrientation } from "../types";
import type { LayoutPdfNode, PageMarginSource, PageSize } from "../types/internal";
import { decorateNode as decorateLayoutNode } from "../layout/node.decorators";
import { moveDownWithPageBreak } from "../engine/layout-pagination";
import {
	decorateRegisteredNodeFeature,
	layoutRegisteredNodeFeature,
	preparePageRegisteredNodeFeature,
	resetRegisteredNodeFeature,
} from "./built-in-feature-registry";

type BuiltInLayoutHost = {
	readonly writer: PageElementWriter;
	readonly pageMargins: PageMarginSource;
	readonly pageSize: PageSize;
	readonly suppressLinearNodeList: boolean;
	nestedLevel: number;
	processNode(
		node: LayoutPdfNode,
		isVerticalAlignmentAllowed?: boolean,
	): VerticalAlignmentControls | undefined;
	advanceFlowRegion(pageOrientation?: PageOrientation, options?: FlowAdvanceOptions): FlowAdvance;
};

export function createBuiltInLayout(host: BuiltInLayoutHost) {
	const moveDown = (height: number, pageOrientation?: PageOrientation): void =>
		moveDownWithPageBreak(height, pageOrientation, {
			writer: host.writer,
			advanceFlowRegion: (orientation) => host.advanceFlowRegion(orientation),
		});
	const context: NodeLayoutContext = {
		get writer() {
			return host.writer;
		},
		pageMargins: host.pageMargins,
		pageSize: host.pageSize,
		get suppressLinearNodeList() {
			return host.suppressLinearNodeList;
		},
		get nestedLevel() {
			return host.nestedLevel;
		},
		set nestedLevel(value) {
			host.nestedLevel = value;
		},
		processNode: (node, isVerticalAlignmentAllowed) =>
			host.processNode(node, isVerticalAlignmentAllowed),
		advanceFlowRegion: (orientation, options) => host.advanceFlowRegion(orientation, options),
		isInFlow: () => host.writer.context().getFlowSnapshot() !== null,
		preparePage: (node) => preparePageRegisteredNodeFeature(node, context),
		moveDownWithPageBreak: moveDown,
	};
	const nodeDecorationHooks = {
		decorateFeature: decorateRegisteredNodeFeature,
		resetFeature: resetRegisteredNodeFeature,
	};

	return {
		requiresFirstPage: (document: LayoutPdfNode): boolean => {
			if (document._kind === "stack" && document.stack[0]?._kind === "section") return false;
			return document._kind !== "section";
		},
		decorateNode: (node: LayoutPdfNode): void => decorateLayoutNode(node, nodeDecorationHooks),
		moveDownWithPageBreak: moveDown,
		layoutNode: (node: LayoutPdfNode): void => {
			layoutRegisteredNodeFeature(node, context);
		},
	};
}
