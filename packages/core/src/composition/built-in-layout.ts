import TableRowLayout, { type TableRowLayoutHost } from "../features/table/layout-row";
import type { NodeLayoutContext } from "../engine/contracts/node-feature";
import type { PageOrientation } from "../types";
import type { LayoutPdfNode, PageMarginSource, PageSize } from "../types/internal";
import { decorateNode as decorateLayoutNode } from "../layout/node.decorators";
import {
	decorateRegisteredNodeFeature,
	layoutRegisteredNodeFeature,
	resetRegisteredNodeFeature,
} from "./built-in-feature-registry";

interface BuiltInLayoutHost extends TableRowLayoutHost {
	readonly pageMargins: PageMarginSource;
	readonly pageSize: PageSize;
	readonly suppressLinearNodeList: boolean;
}

export function createBuiltInLayout(
	host: BuiltInLayoutHost,
	callbacks: {
		moveDownWithPageBreak(height: number, pageOrientation?: PageOrientation): void;
	},
) {
	const rows = new TableRowLayout(host);
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
		processRow: (options) => rows.processRow(options),
		snakingAwarePageBreak: (orientation) => host.snakingAwarePageBreak(orientation),
		moveDownWithPageBreak: callbacks.moveDownWithPageBreak,
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
		layoutNode: (node: LayoutPdfNode): void => {
			if (node._span) return;
			layoutRegisteredNodeFeature(node, context);
		},
	};
}
