import { stringifyNode } from "../utils/node";
import type { NodeReference, PreprocessedPdfNode } from "../types/internal";
import type { PdfCraftExtensions } from "../types";
import { createBuiltInPreprocessing } from "../composition/built-in-preprocessing";

class DocPreprocessor {
	declare parentNode: PreprocessedPdfNode | null;
	declare tocs: Record<string, PreprocessedPdfNode>;
	declare nodeReferences: Record<string, NodeReference<PreprocessedPdfNode>>;
	private readonly preprocessing: ReturnType<typeof createBuiltInPreprocessing>;

	constructor(extensions: PdfCraftExtensions = []) {
		this.parentNode = null;
		this.tocs = {};
		this.nodeReferences = {};
		this.preprocessing = createBuiltInPreprocessing(this, extensions);
	}

	preprocessDocument(docStructure: unknown): PreprocessedPdfNode {
		this.parentNode = null;
		this.tocs = {};
		this.nodeReferences = {};
		return this.preprocessNode(docStructure, true);
	}

	preprocessBlock(node: unknown): PreprocessedPdfNode {
		this.parentNode = null;
		this.tocs = {};
		this.nodeReferences = {};
		return this.preprocessNode(node);
	}

	preprocessNode(input: unknown, isSectionAllowed: boolean = false): PreprocessedPdfNode {
		const node = this.preprocessing.normalizeNode(input);
		const result = this.preprocessing.processNode(node, isSectionAllowed);
		if (result) return result;
		throw new Error(`Unrecognized document structure: ${stringifyNode(node)}`);
	}
}

export default DocPreprocessor;
