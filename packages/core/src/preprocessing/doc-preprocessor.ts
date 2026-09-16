import { stringifyNode } from "../utils/node";
import type { NodeReference, PreprocessedPdfNode } from "../types/internal";
import type { PdfCraftExtensions } from "../types";
import { preprocessNodeReferences } from "../services/references/preprocess-node-references";
import {
	createBuiltInPreprocessing,
	type BuiltInPreprocessing,
} from "../composition/built-in-preprocessing";

class DocPreprocessor {
	declare parentNode: PreprocessedPdfNode | null;
	declare tocs: Record<string, PreprocessedPdfNode>;
	declare nodeReferences: Record<string, NodeReference<PreprocessedPdfNode>>;
	private readonly preprocessing: BuiltInPreprocessing;

	constructor(extensions: PdfCraftExtensions = []) {
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

	preprocessAcroForm(node: PreprocessedPdfNode): PreprocessedPdfNode {
		return this.preprocessing.preprocessAcroForm(node);
	}

	preprocessSection(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean = true,
	): PreprocessedPdfNode {
		return this.preprocessing.preprocessSection(node, isSectionAllowed);
	}

	preprocessColumns(node: PreprocessedPdfNode): PreprocessedPdfNode {
		return this.preprocessing.preprocessColumns(node);
	}

	preprocessVerticalContainer(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean,
	): PreprocessedPdfNode {
		return this.preprocessing.preprocessVerticalContainer(node, isSectionAllowed);
	}

	preprocessDecoratedVerticalContainer(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean,
	): PreprocessedPdfNode {
		return this.preprocessing.preprocessDecoratedVerticalContainer(node, isSectionAllowed);
	}

	preprocessList(node: PreprocessedPdfNode): PreprocessedPdfNode {
		return this.preprocessing.preprocessList(node);
	}

	preprocessTable(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean = false,
	): PreprocessedPdfNode {
		return this.preprocessing.preprocessTable(node, isSectionAllowed);
	}

	preprocessText(node: PreprocessedPdfNode): PreprocessedPdfNode {
		return this.preprocessing.preprocessText(node);
	}

	registerTocItem(node: PreprocessedPdfNode): void {
		this.preprocessing.registerTocItem(node);
	}

	preprocessReferences(node: PreprocessedPdfNode): void {
		preprocessNodeReferences(node, {
			parentNode: this.parentNode,
			nodeReferences: this.nodeReferences,
		});
	}

	preprocessToc(node: PreprocessedPdfNode): PreprocessedPdfNode {
		return this.preprocessing.preprocessToc(node);
	}
}

export default DocPreprocessor;
