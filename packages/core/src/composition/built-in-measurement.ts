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
import { textFeature } from "../features/text/text.feature";
import TextInlines from "../features/text/text-inlines";
import { tocFeature } from "../features/toc/toc.feature";
import { createBuiltInFeatureHandlers } from "./built-in-feature-registry";
import { dispatchNodeStage, type NodeStageHandler } from "../engine/node-stage-dispatcher";
import type PDFDocument from "../rendering/pdf-document";
import type StyleContextStack from "../services/styles/style-context-stack";
import type { Dictionary, PdfCraftExtensions } from "../types";
import type { MeasuredPdfNode, PreprocessedPdfNode, TableLayout } from "../types/internal";
import { getNodeMargin, stringifyNode } from "../utils/node";

interface BuiltInMeasurementHost {
	readonly pdfDocument: PDFDocument;
	readonly textInlines: TextInlines;
	readonly styleStack: StyleContextStack;
	readonly extensions: PdfCraftExtensions;
	readonly tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>;
	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode;
}

export function createBuiltInMeasurement(host: BuiltInMeasurementHost) {
	const media = imageFeature.createMeasurer(host.pdfDocument, host.styleStack);
	const textInlines = new TextInlines(
		host.pdfDocument,
		(node) => imageFeature.measure(node, media),
		(inline) => acroFormFeature.measureInline(inline),
	);
	const handlers: NodeStageHandler<MeasuredPdfNode, undefined, MeasuredPdfNode>[] = [
		...createBuiltInFeatureHandlers<MeasuredPdfNode, undefined, MeasuredPdfNode>({
			section: (node) =>
				sectionFeature.measure(node, {
					measureNode: (item) => host.measureNode(item),
				}),
			columns: (node) =>
				columnsFeature.measure(node, {
					styles: host.styleStack,
					measureChild: (column) => host.measureNode(column),
				}),
			stack: (node) =>
				stackFeature.measure(node, {
					measureChild: (item) => host.measureNode(item),
				}),
			list: (node) =>
				listFeature.measure(node, {
					styles: host.styleStack,
					measureChild: (item) => host.measureNode(item),
					measureGap: () => host.textInlines.sizeOfText("9. ", host.styleStack),
					buildMarkerInlines: (text, color, styles) =>
						host.textInlines.buildInlines({ text, color }, styles).items,
				}),
			table: (node) =>
				tableFeature.measure(node, {
					styles: host.styleStack,
					tableLayouts: host.tableLayouts,
					measureNode: (cell) => host.measureNode(cell),
				}),
			text: (node) =>
				textFeature.measure(node, {
					inlines: host.textInlines,
					styles: host.styleStack,
				}),
			toc: (node) =>
				tocFeature.measure(node, {
					measureNode: (item) => host.measureNode(item),
				}),
			image: (node) => imageFeature.measure(node, media),
			canvas: (node) => canvasFeature.measure(node, host.styleStack),
			attachment: (node) => attachmentFeature.measure(node, undefined),
			acroform: (node) =>
				acroFormFeature.measure(node, {
					document: host.pdfDocument,
					styles: host.styleStack,
				}),
		}),
		{
			matches: () => true,
			process: (node) =>
				extensionFeature.measure(node, {
					document: host.pdfDocument,
					styles: host.styleStack,
					extensions: host.extensions,
				}),
		},
	];

	return {
		textInlines,
		measureNode: (node: PreprocessedPdfNode): MeasuredPdfNode => {
			const measuredNode = node as MeasuredPdfNode;
			return host.styleStack.auto(measuredNode, () => {
				measuredNode._margin = getNodeMargin(measuredNode, host.styleStack);
				const paragraphGap = host.styleStack.getProperty("paragraphGap");
				measuredNode._paragraphGap =
					typeof paragraphGap === "number" ? Math.max(0, paragraphGap) : 0;

				const result = dispatchNodeStage(measuredNode, undefined, handlers);
				if (!result.handled || !result.value) {
					throw new Error(`Unrecognized document structure: ${stringifyNode(measuredNode)}`);
				}

				const margin = result.value._margin;
				if (margin) {
					result.value._minWidth = (result.value._minWidth ?? 0) + margin[0] + margin[2];
					result.value._maxWidth = (result.value._maxWidth ?? 0) + margin[0] + margin[2];
				}
				return result.value;
			});
		},
	};
}
