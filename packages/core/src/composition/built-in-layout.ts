import { acroFormFeature } from "../features/acroform/acroform.feature";
import { attachmentFeature } from "../features/attachment/attachment.feature";
import { canvasFeature } from "../features/canvas/canvas.feature";
import { columnsFeature } from "../features/columns/columns.feature";
import { extensionFeature } from "../features/extension/extension.feature";
import { imageFeature } from "../features/image/image.feature";
import { listFeature } from "../features/list/list.feature";
import { sectionFeature } from "../features/section/section.feature";
import { stackFeature } from "../features/stack/stack.feature";
import { tableFeature } from "../features/table/table.feature";
import TableRowLayout, { type TableRowLayoutHost } from "../features/table/layout-row";
import type { TableLayoutHost } from "../features/table/layout-table";
import { textFeature } from "../features/text/text.feature";
import { tocFeature } from "../features/toc/toc.feature";
import type { PageOrientation } from "../types";
import type { LayoutPdfNode, PageMarginSource, PageSize } from "../types/internal";
import { decorateNode as decorateLayoutNode } from "../layout/node.decorators";

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
	const tableHost: TableLayoutHost = {
		get writer() {
			return host.writer;
		},
		get nestedLevel() {
			return host.nestedLevel;
		},
		set nestedLevel(value) {
			host.nestedLevel = value;
		},
		processRow: (options) => rows.processRow(options),
		snakingAwarePageBreak: () => host.snakingAwarePageBreak(),
	};
	const layoutByKind = (node: LayoutPdfNode): void => {
		switch (node._kind) {
			case "stack":
				return stackFeature.layout(node, {
					processNode: (item) => host.processNode(item),
					moveDownWithPageBreak: callbacks.moveDownWithPageBreak,
				});
			case "section":
				return sectionFeature.layout(node, {
					writer: host.writer,
					defaultPageSize: host.pageSize,
					defaultPageMargins: host.pageMargins,
					processNode: (item) => host.processNode(item),
				});
			case "columns":
				return columnsFeature.layout(node, {
					writer: host.writer,
					enterNestedLevel: () => {
						host.nestedLevel++;
					},
					leaveNestedLevel: () => --host.nestedLevel,
					processRow: (options) => rows.processRow(options),
				});
			case "list":
				return listFeature.layout(node, {
					writer: host.writer,
					ordered: !node.ul,
					getPageWidth: () => host.pageSize.width,
					isLinearNodeListSuppressed: () => host.suppressLinearNodeList,
					processNode: (item) => host.processNode(item),
				});
			case "table":
				return tableFeature.layout(node, tableHost);
			case "text":
				return textFeature.layout(node, {
					writer: host.writer,
					snakingAwarePageBreak: (orientation) => host.snakingAwarePageBreak(orientation),
				});
			case "toc":
				return tocFeature.layout(node, {
					processNode: (item) => host.processNode(item),
				});
			case "image":
				return imageFeature.layout(node, { writer: host.writer });
			case "canvas":
				return canvasFeature.layout(node, { writer: host.writer });
			case "attachment":
				return attachmentFeature.layout(node, { writer: host.writer });
			case "acroform":
				return acroFormFeature.layout(node, { writer: host.writer });
			case "extension":
				return extensionFeature.layout(node, { writer: host.writer });
		}
	};
	const nodeDecorationHooks = {
		decorateFeature: (node: LayoutPdfNode) => {
			if (node._kind === "canvas") canvasFeature.decorate(node);
		},
		resetFeature: (node: LayoutPdfNode) => {
			if (node._kind === "canvas") canvasFeature.reset(node);
		},
	};

	return {
		requiresFirstPage: (document: LayoutPdfNode): boolean => {
			if (document._kind === "stack" && document.stack[0]?._kind === "section") return false;
			return document._kind !== "section";
		},
		decorateNode: (node: LayoutPdfNode): void => decorateLayoutNode(node, nodeDecorationHooks),
		layoutNode: (node: LayoutPdfNode): void => {
			if (node._span) return;
			layoutByKind(node);
		},
	};
}
