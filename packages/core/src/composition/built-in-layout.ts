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
import TableRowLayout, {
	type ProcessRowOptions,
	type ProcessRowResult,
	type TableRowLayoutHost,
} from "../features/table/layout-row";
import { textFeature } from "../features/text/text.feature";
import { tocFeature } from "../features/toc/toc.feature";
import {
	createBuiltInFeatureHandlers,
	type BuiltInFeatureName,
	type BuiltInFeatureProcessors,
} from "./built-in-feature-registry";
import { dispatchNodeStage } from "../engine/node-stage-dispatcher";
import type { PageOrientation } from "../types";
import type { LayoutPdfNode, PageMarginSource, PageSize } from "../types/internal";
import { stringifyNode } from "../utils/node";
import { decorateNode as decorateLayoutNode } from "../layout/node.decorators";

const PRIMARY_LAYOUT_FEATURES = [
	"stack",
	"section",
	"columns",
	"list",
	"table",
	"text",
	"toc",
	"image",
	"canvas",
] as const satisfies readonly BuiltInFeatureName[];

const TRAILING_LAYOUT_FEATURES = [
	"attachment",
	"acroform",
] as const satisfies readonly BuiltInFeatureName[];

interface BuiltInLayoutHost extends TableRowLayoutHost {
	readonly pageMargins: PageMarginSource;
	readonly pageSize: PageSize;
	readonly suppressLinearNodeList: boolean;
	processRow(options: ProcessRowOptions): ProcessRowResult;
	processVerticalContainer(node: LayoutPdfNode): void;
	processSection(node: LayoutPdfNode): void;
	processColumns(node: LayoutPdfNode): void;
	snakingAwarePageBreak(pageOrientation?: PageOrientation): void;
}

interface BuiltInLayoutCallbacks {
	moveDownWithPageBreak(height: number, pageOrientation?: PageOrientation): void;
}

export interface BuiltInLayout {
	requiresFirstPage(document: LayoutPdfNode): boolean;
	decorateNode(node: LayoutPdfNode): void;
	layoutNode(node: LayoutPdfNode): void;
	layoutVerticalContainer(node: LayoutPdfNode): void;
	layoutSection(node: LayoutPdfNode): void;
	layoutColumns(node: LayoutPdfNode): void;
	processRow(options: ProcessRowOptions): ProcessRowResult;
}

export function createBuiltInLayout(
	host: BuiltInLayoutHost,
	callbacks: BuiltInLayoutCallbacks,
): BuiltInLayout {
	const rows = new TableRowLayout(host);
	const processors: BuiltInFeatureProcessors<LayoutPdfNode, undefined, void> = {
		stack: (node) => host.processVerticalContainer(node),
		section: (node) => host.processSection(node),
		columns: (node) => host.processColumns(node),
		list: (node) =>
			listFeature.layout(node, {
				writer: host.writer,
				ordered: !node.ul,
				getPageWidth: () => host.pageSize.width,
				isLinearNodeListSuppressed: () => host.suppressLinearNodeList,
				processNode: (item) => host.processNode(item),
			}),
		table: (node) => tableFeature.layout(node, host),
		text: (node) =>
			textFeature.layout(node, {
				writer: host.writer,
				snakingAwarePageBreak: (orientation) => host.snakingAwarePageBreak(orientation),
			}),
		toc: (node) =>
			tocFeature.layout(node, {
				processNode: (item) => host.processNode(item),
			}),
		image: (node) => imageFeature.layout(node, { writer: host.writer }),
		canvas: (node) => canvasFeature.layout(node, { writer: host.writer }),
		attachment: (node) => attachmentFeature.layout(node, { writer: host.writer }),
		acroform: (node) => acroFormFeature.layout(node, { writer: host.writer }),
	};
	const primaryHandlers = createBuiltInFeatureHandlers(processors, PRIMARY_LAYOUT_FEATURES);
	const trailingHandlers = createBuiltInFeatureHandlers(processors, TRAILING_LAYOUT_FEATURES);
	const nodeDecorationHooks = {
		decorateFeature: (node: LayoutPdfNode) => {
			if (Array.isArray(node.canvas)) canvasFeature.decorate(node);
		},
		resetFeature: (node: LayoutPdfNode) => {
			if (Array.isArray(node.canvas)) canvasFeature.reset(node);
		},
	};

	return {
		requiresFirstPage: (document) => {
			if (document.stack?.length && sectionFeature.matches(document.stack[0])) return false;
			return !sectionFeature.matches(document);
		},
		decorateNode: (node) => decorateLayoutNode(node, nodeDecorationHooks),
		layoutNode: (node) => {
			if (dispatchNodeStage(node, undefined, primaryHandlers).handled) return;

			if (node._extension) {
				extensionFeature.layout(node, { writer: host.writer });
				return;
			}

			if (dispatchNodeStage(node, undefined, trailingHandlers).handled) return;
			if (!node._span) throw new Error(`Unrecognized document structure: ${stringifyNode(node)}`);
		},
		layoutVerticalContainer: (node) =>
			stackFeature.layout(node, {
				processNode: (item) => host.processNode(item),
				moveDownWithPageBreak: callbacks.moveDownWithPageBreak,
			}),
		layoutSection: (node) =>
			sectionFeature.layout(node, {
				writer: host.writer,
				defaultPageSize: host.pageSize,
				defaultPageMargins: host.pageMargins,
				processNode: (item) => host.processNode(item),
			}),
		layoutColumns: (node) =>
			columnsFeature.layout(node, {
				writer: host.writer,
				enterNestedLevel: () => {
					host.nestedLevel++;
				},
				leaveNestedLevel: () => --host.nestedLevel,
				processRow: (options) => host.processRow(options),
			}),
		processRow: (options) => rows.processRow(options),
	};
}
