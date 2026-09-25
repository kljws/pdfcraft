import { acroFormFeature } from "../features/acroform/acroform.feature";
import { imageFeature } from "../features/image/image.feature";
import type { ListMeasureCapabilities } from "../features/list/list.feature";
import type { TextMeasureCapabilities } from "../features/text/text.feature";
import TextInlines from "../features/text/text-inlines";
import type { NodeMeasureContext } from "../engine/contracts/node-feature";
import type PDFDocument from "../rendering/pdf-document";
import StyleContextStack from "../services/styles/style-context-stack";
import type { Dictionary, PdfCraftExtensions, Style } from "../types";
import type {
	MeasurePdfNode,
	MeasuredPdfNode,
	PreprocessedPdfNode,
	TableLayout,
} from "../types/internal";
import { getNodeMargin, stringifyNode } from "../utils/node";
import { measureRegisteredNodeFeature } from "./built-in-feature-registry";

type BuiltInMeasureContext = NodeMeasureContext & ListMeasureCapabilities & TextMeasureCapabilities;

export interface BuiltInMeasurementOptions {
	readonly document: PDFDocument;
	readonly styleDictionary?: Dictionary<Style>;
	readonly defaultStyle?: Style;
	readonly extensions?: PdfCraftExtensions;
	readonly tableLayouts?: Dictionary<Partial<TableLayout<MeasuredPdfNode>>>;
	/** Replaces the inline text engine, e.g. with a test double. */
	readonly textInlines?: TextInlines;
}

/** Measures preprocessed node trees with one style stack shared by every measured node. */
export function createBuiltInMeasurement(options: BuiltInMeasurementOptions) {
	const styleStack = new StyleContextStack(
		options.styleDictionary ?? {},
		options.defaultStyle ?? {},
	);
	const context: BuiltInMeasureContext = {
		document: options.document,
		styles: styleStack,
		get inlines() {
			return textInlines;
		},
		extensions: options.extensions ?? [],
		tableLayouts: options.tableLayouts ?? {},
		featureState: new Map(),
		measureNode: (node) => measureNode(node),
	};
	const textInlines =
		options.textInlines ??
		new TextInlines(
			options.document,
			(node) => imageFeature.inline.measure(node, context),
			(inline) => acroFormFeature.measureInline(inline),
		);

	function measureNode(node: PreprocessedPdfNode): MeasuredPdfNode {
		const measuredNode = node as unknown as MeasurePdfNode;
		return styleStack.auto(measuredNode, () => {
			measuredNode._margin = getNodeMargin(measuredNode, styleStack);
			const paragraphGap = styleStack.getProperty("paragraphGap");
			measuredNode._paragraphGap = typeof paragraphGap === "number" ? Math.max(0, paragraphGap) : 0;

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
	}

	return { measureNode };
}

export type BuiltInMeasurement = ReturnType<typeof createBuiltInMeasurement>;
