import { acroFormFeature } from "../features/acroform/acroform.feature";
import { attachmentFeature } from "../features/attachment/attachment.feature";
import { canvasFeature } from "../features/canvas/canvas.feature";
import { columnsFeature } from "../features/columns/columns.feature";
import { extensionFeature } from "../features/extension/extension.feature";
import { imageFeature } from "../features/image/image.feature";
import type { MeasuredImageNode } from "../features/image/image.types";
import { listFeature } from "../features/list/list.feature";
import { sectionFeature } from "../features/section/section.feature";
import { stackFeature } from "../features/stack/stack.feature";
import { tableFeature } from "../features/table/table.feature";
import { textFeature } from "../features/text/text.feature";
import TextInlines from "../features/text/text-inlines";
import { tocFeature } from "../features/toc/toc.feature";
import type PDFDocument from "../rendering/pdf-document";
import type StyleContextStack from "../services/styles/style-context-stack";
import type { Dictionary, PdfCraftExtensions } from "../types";
import type {
	MeasurePdfNode,
	MeasuredPdfNode,
	PreprocessedPdfNode,
	TableLayout,
} from "../types/internal";
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
		(node) => imageFeature.measure(node as MeasuredImageNode, media),
		(inline) => acroFormFeature.measureInline(inline),
	);
	const measureByKind = (node: MeasurePdfNode): MeasuredPdfNode | undefined => {
		switch (node._kind) {
			case "section":
				return sectionFeature.measure(node, {
					measureNode: (item) => host.measureNode(item),
				});
			case "columns":
				return columnsFeature.measure(node, {
					styles: host.styleStack,
					measureChild: (column) => host.measureNode(column),
				});
			case "stack":
				return stackFeature.measure(node, {
					measureChild: (item) => host.measureNode(item),
				});
			case "list":
				return listFeature.measure(node, {
					styles: host.styleStack,
					measureChild: (item) => host.measureNode(item),
					measureGap: () => host.textInlines.sizeOfText("9. ", host.styleStack),
					buildMarkerInlines: (text, color, styles) =>
						host.textInlines.buildInlines({ text, color }, styles).items,
				});
			case "table":
				return tableFeature.measure(node, {
					styles: host.styleStack,
					tableLayouts: host.tableLayouts,
					measureNode: (cell) => host.measureNode(cell as unknown as PreprocessedPdfNode),
				});
			case "text":
				return textFeature.measure(node, {
					inlines: host.textInlines,
					styles: host.styleStack,
				});
			case "toc":
				return tocFeature.measure(node, {
					measureNode: (item) => host.measureNode(item),
				});
			case "image":
				return imageFeature.measure(node, media);
			case "canvas":
				return canvasFeature.measure(node, host.styleStack);
			case "attachment":
				return attachmentFeature.measure(node, undefined);
			case "acroform":
				return acroFormFeature.measure(node, {
					document: host.pdfDocument,
					styles: host.styleStack,
				});
			case "extension":
				return extensionFeature.measure(node, {
					document: host.pdfDocument,
					styles: host.styleStack,
					extensions: host.extensions,
				});
		}
	};

	return {
		textInlines,
		measureNode: (node: PreprocessedPdfNode): MeasuredPdfNode => {
			const measuredNode = node as unknown as MeasurePdfNode;
			return host.styleStack.auto(measuredNode, () => {
				measuredNode._margin = getNodeMargin(measuredNode, host.styleStack);
				const paragraphGap = host.styleStack.getProperty("paragraphGap");
				measuredNode._paragraphGap =
					typeof paragraphGap === "number" ? Math.max(0, paragraphGap) : 0;

				const result = measureByKind(measuredNode);
				if (!result) {
					throw new Error(`Unrecognized document structure: ${stringifyNode(measuredNode)}`);
				}

				const margin = result._margin;
				if (margin) {
					result._minWidth = (result._minWidth ?? 0) + margin[0] + margin[2];
					result._maxWidth = (result._maxWidth ?? 0) + margin[0] + margin[2];
				}
				return result;
			});
		},
	};
}
