import { acroFormFeature } from "../features/acroform/acroform.feature";
import TextInlines from "../features/text/text-inlines";
import type { NodeMeasureContext } from "../engine/contracts/node-feature";
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
import {
	measureInlineImageFeature,
	measureRegisteredNodeFeature,
} from "./built-in-feature-registry";

interface BuiltInMeasurementHost {
	readonly pdfDocument: PDFDocument;
	readonly textInlines: TextInlines;
	readonly styleStack: StyleContextStack;
	readonly extensions: PdfCraftExtensions;
	readonly tableLayouts: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>;
	measureNode(node: PreprocessedPdfNode): MeasuredPdfNode;
}

export function createBuiltInMeasurement(host: BuiltInMeasurementHost) {
	const context: NodeMeasureContext = {
		document: host.pdfDocument,
		styles: host.styleStack,
		get inlines() {
			return host.textInlines;
		},
		extensions: host.extensions,
		tableLayouts: host.tableLayouts,
		featureState: new Map(),
		measureNode: (node) => host.measureNode(node),
	};
	const textInlines = new TextInlines(
		host.pdfDocument,
		(node) => measureInlineImageFeature(node, context),
		(inline) => acroFormFeature.measureInline(inline),
	);

	return {
		textInlines,
		measureNode: (node: PreprocessedPdfNode): MeasuredPdfNode => {
			const measuredNode = node as unknown as MeasurePdfNode;
			return host.styleStack.auto(measuredNode, () => {
				measuredNode._margin = getNodeMargin(measuredNode, host.styleStack);
				const paragraphGap = host.styleStack.getProperty("paragraphGap");
				measuredNode._paragraphGap =
					typeof paragraphGap === "number" ? Math.max(0, paragraphGap) : 0;

				const result = measureRegisteredNodeFeature(measuredNode, context);
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
