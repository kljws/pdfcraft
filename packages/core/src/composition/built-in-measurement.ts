import { acroFormFeature } from "../features/acroform/acroform.feature";
import { attachmentFeature } from "../features/attachment/attachment.feature";
import { canvasFeature } from "../features/canvas/canvas.feature";
import { columnsFeature } from "../features/columns/columns.feature";
import { extensionFeature } from "../features/extension/extension.feature";
import { imageFeature } from "../features/image/image.feature";
import type ImageMeasurer from "../features/image/image-measurer";
import { listFeature } from "../features/list/list.feature";
import type { ListMeasureContext } from "../features/list/measure-list";
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
	measureAcroForm(node: MeasuredPdfNode): MeasuredPdfNode;
	measureVerticalContainer(node: MeasuredPdfNode): MeasuredPdfNode;
	measureColumns(node: MeasuredPdfNode): MeasuredPdfNode;
	measureList(node: MeasuredPdfNode): MeasuredPdfNode;
	measureSection(node: MeasuredPdfNode): MeasuredPdfNode;
	measureLeaf(node: MeasuredPdfNode): MeasuredPdfNode;
	measureToc(node: MeasuredPdfNode): MeasuredPdfNode;
	measureTable(node: MeasuredPdfNode): MeasuredPdfNode;
	measureCanvas(node: MeasuredPdfNode): MeasuredPdfNode;
}

export interface BuiltInMeasurement {
	readonly media: ImageMeasurer;
	readonly textInlines: TextInlines;
	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode;
	measureAcroForm(node: MeasuredPdfNode): MeasuredPdfNode;
	measureVerticalContainer(node: MeasuredPdfNode): MeasuredPdfNode;
	measureColumns(node: MeasuredPdfNode): MeasuredPdfNode;
	measureList(node: MeasuredPdfNode): MeasuredPdfNode;
	measureUnorderedList(node: MeasuredPdfNode): MeasuredPdfNode;
	measureOrderedList(node: MeasuredPdfNode): MeasuredPdfNode;
	measureSection(node: MeasuredPdfNode): MeasuredPdfNode;
	measureLeaf(node: MeasuredPdfNode): MeasuredPdfNode;
	measureToc(node: MeasuredPdfNode): MeasuredPdfNode;
	measureTable(node: MeasuredPdfNode): MeasuredPdfNode;
	measureCanvas(node: MeasuredPdfNode): MeasuredPdfNode;
}

export function createBuiltInMeasurement(host: BuiltInMeasurementHost): BuiltInMeasurement {
	const media = imageFeature.createMeasurer(host.pdfDocument, host.styleStack);
	const textInlines = new TextInlines(
		host.pdfDocument,
		(node) => imageFeature.measure(node, media),
		(inline) => acroFormFeature.measureInline(inline),
	);
	const listContext = (): ListMeasureContext => ({
		styles: host.styleStack,
		measureChild: (node) => host.measureNode(node),
		measureGap: () => host.textInlines.sizeOfText("9. ", host.styleStack),
		buildMarkerInlines: (text, color, styles) =>
			host.textInlines.buildInlines({ text, color }, styles).items,
	});
	const handlers: NodeStageHandler<MeasuredPdfNode, undefined, MeasuredPdfNode>[] = [
		...createBuiltInFeatureHandlers<MeasuredPdfNode, undefined, MeasuredPdfNode>({
			section: (node) => host.measureSection(node),
			columns: (node) => host.measureColumns(node),
			stack: (node) => host.measureVerticalContainer(node),
			list: (node) => host.measureList(node),
			table: (node) => host.measureTable(node),
			text: (node) => host.measureLeaf(node),
			toc: (node) => host.measureToc(node),
			image: (node) => imageFeature.measure(node, media),
			canvas: (node) => host.measureCanvas(node),
			attachment: (node) => attachmentFeature.measure(node, undefined),
			acroform: (node) => host.measureAcroForm(node),
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
		media,
		textInlines,
		measureNode: (node) => {
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
		measureAcroForm: (node) =>
			acroFormFeature.measure(node, {
				document: host.pdfDocument,
				styles: host.styleStack,
			}),
		measureVerticalContainer: (node) =>
			stackFeature.measure(node, {
				measureChild: (item) => host.measureNode(item),
			}),
		measureColumns: (node) =>
			columnsFeature.measure(node, {
				styles: host.styleStack,
				measureChild: (column) => host.measureNode(column),
			}),
		measureList: (node) => listFeature.measure(node, listContext()),
		measureUnorderedList: (node) => listFeature.measureUnordered(node, listContext()),
		measureOrderedList: (node) => listFeature.measureOrdered(node, listContext()),
		measureSection: (node) =>
			sectionFeature.measure(node, {
				measureNode: (item) => host.measureNode(item),
			}),
		measureLeaf: (node) =>
			textFeature.measure(node, {
				inlines: host.textInlines,
				styles: host.styleStack,
			}),
		measureToc: (node) =>
			tocFeature.measure(node, {
				measureNode: (item) => host.measureNode(item),
			}),
		measureTable: (node) =>
			tableFeature.measure(node, {
				styles: host.styleStack,
				tableLayouts: host.tableLayouts,
				measureNode: (cell) => host.measureNode(cell),
			}),
		measureCanvas: (node) => canvasFeature.measure(node, host.styleStack),
	};
}
