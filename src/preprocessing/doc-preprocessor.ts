import {
	isString,
	isNumber,
	isPositiveInteger,
	isValue,
	isEmptyObject,
	isObject,
} from "../utils/variable-type";
import { stringifyNode } from "../utils/node";
import type {
	ColumnNode,
	NodeReference,
	NodeText,
	PreprocessedPdfNode,
	RawPdfNode,
} from "../types/internal";

const convertValueToString = (value: unknown): unknown => {
	if (isString(value)) {
		return value.replace(/\t/g, "    "); // expand tab as spaces
	} else if (isNumber(value) || typeof value === "boolean") {
		return value.toString();
	} else if (!isValue(value) || isEmptyObject(value)) {
		return "";
	}

	return value;
};

const convertTextValueToString = (value: unknown): unknown => {
	if (
		!isString(value) &&
		!isNumber(value) &&
		typeof value !== "boolean" &&
		isValue(value) &&
		!isEmptyObject(value) &&
		!Array.isArray(value) &&
		(!isObject(value) || !("text" in value))
	) {
		throw new Error(
			`Invalid text value: expected a string, number, boolean, array or nested text node, received ${stringifyNode(value)}`,
		);
	}

	return convertValueToString(value);
};

const requireNodeArray = (
	value: unknown,
	property: string,
	node: PreprocessedPdfNode,
): unknown[] => {
	if (!Array.isArray(value)) {
		throw new Error(
			`Invalid ${property} node: '${property}' must be an array, received ${stringifyNode(node)}`,
		);
	}

	return value;
};

class DocPreprocessor {
	declare parentNode: PreprocessedPdfNode | null;
	declare tocs: Record<string, PreprocessedPdfNode>;
	declare nodeReferences: Record<string, NodeReference<PreprocessedPdfNode>>;

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
		let rawNode: RawPdfNode;

		// expand shortcuts and casting values
		if (Array.isArray(input)) {
			rawNode = { stack: input as RawPdfNode[] };
		} else if (
			isString(input) ||
			isNumber(input) ||
			typeof input === "boolean" ||
			!isValue(input) ||
			isEmptyObject(input)
		) {
			// text node defined as value
			rawNode = { text: convertValueToString(input) as NodeText<RawPdfNode> };
		} else if (isObject(input)) {
			rawNode = input as RawPdfNode;
		} else {
			const description =
				typeof input === "symbol" || typeof input === "function"
					? String(input)
					: stringifyNode(input);
			throw new Error(`Unrecognized document structure: ${description}`);
		}
		const node = rawNode as PreprocessedPdfNode;

		if ("text" in node) {
			// cast value in text property
			node.text = convertTextValueToString(node.text) as NodeText<PreprocessedPdfNode>;
		}

		if (node.section) {
			if (!isSectionAllowed) {
				throw new Error(
					`Incorrect document structure, section node is only allowed at the root level of document structure: ${stringifyNode(node)}`,
				);
			}

			return this.preprocessSection(node);
		} else if (node.columns) {
			return this.preprocessColumns(node);
		} else if (node.stack) {
			return this.preprocessVerticalContainer(node, isSectionAllowed);
		} else if (node.ul) {
			return this.preprocessList(node);
		} else if (node.ol) {
			return this.preprocessList(node);
		} else if (node.table) {
			return this.preprocessTable(node);
		} else if (node.text !== undefined) {
			return this.preprocessText(node);
		} else if (node.toc) {
			return this.preprocessToc(node);
		} else if (node.image) {
			return this.preprocessImage(node);
		} else if (node.svg) {
			return this.preprocessSVG(node);
		} else if (node.canvas) {
			return this.preprocessCanvas(node);
		} else if (node.qr) {
			return this.preprocessQr(node);
		} else if (node.attachment) {
			return this.preprocessAttachment(node);
		} else if (node.acroform) {
			return this.preprocessAcroForm(node);
		} else if (node.pageReference || node.textReference) {
			return this.preprocessText(node);
		} else {
			throw new Error(`Unrecognized document structure: ${stringifyNode(node)}`);
		}
	}

	preprocessAcroForm(node: PreprocessedPdfNode): PreprocessedPdfNode {
		const form = node.acroform;
		if (!isObject(form)) {
			throw new Error(`Invalid AcroForm node: 'acroform' must be an object`);
		}
		if (typeof form.id !== "string" || form.id.trim().length === 0) {
			throw new Error(`Invalid AcroForm node: 'acroform.id' must be a non-empty string`);
		}
		if (!["text", "button", "list", "combo", "checkbox"].includes(form.type)) {
			throw new Error(`Invalid AcroForm node: unsupported field type '${String(form.type)}'`);
		}
		if (
			node.width !== undefined &&
			node.width !== "*" &&
			!(isNumber(node.width) && node.width > 0)
		) {
			throw new Error(`Invalid AcroForm node: 'width' must be a positive number or '*'`);
		}
		if (node.height !== undefined && !(isNumber(node.height) && node.height > 0)) {
			throw new Error(`Invalid AcroForm node: 'height' must be a positive number`);
		}
		return node;
	}

	preprocessSection(node: PreprocessedPdfNode): PreprocessedPdfNode {
		node.section = this.preprocessNode(node.section);

		return node;
	}

	preprocessColumns(node: PreprocessedPdfNode): PreprocessedPdfNode {
		const columns = requireNodeArray(node.columns, "columns", node) as NonNullable<
			PreprocessedPdfNode["columns"]
		>;

		for (let i = 0, l = columns.length; i < l; i++) {
			columns[i] = this.preprocessNode(columns[i]) as ColumnNode<PreprocessedPdfNode>;
		}

		return node;
	}

	preprocessVerticalContainer(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean,
	): PreprocessedPdfNode {
		const items = requireNodeArray(node.stack, "stack", node) as PreprocessedPdfNode[];

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.preprocessNode(items[i], isSectionAllowed);
		}

		return node;
	}

	preprocessList(node: PreprocessedPdfNode): PreprocessedPdfNode {
		const property = node.ul ? "ul" : "ol";
		const items = requireNodeArray(node[property], property, node) as PreprocessedPdfNode[];

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.preprocessNode(items[i]);
		}

		return node;
	}

	preprocessTable(node: PreprocessedPdfNode): PreprocessedPdfNode {
		let col;
		let row;
		let cols;
		let rows;

		if (!isObject(node.table)) {
			throw new Error(
				`Invalid table node: 'table' must be an object, received ${stringifyNode(node)}`,
			);
		}
		const table = node.table as unknown as Record<string, unknown>;
		const alreadyNormalized = Array.isArray(table._rowGroups) && Array.isArray(table.body);
		if (!alreadyNormalized) {
			for (const legacyProperty of ["headerRows", "keepWithHeaderRows", "dontBreakRows"]) {
				if (legacyProperty in table) {
					throw new Error(
						`Invalid table node: '${legacyProperty}' is no longer supported; use 'table.header.rows' and grouped 'table.body[].rows' instead`,
					);
				}
			}
		}

		let headerRows: PreprocessedPdfNode[][] = [];
		if (!alreadyNormalized && table.header !== undefined) {
			if (!isObject(table.header)) {
				throw new Error(
					`Invalid table.header node: 'table.header' must be an object, received ${stringifyNode(table.header)}`,
				);
			}
			headerRows = requireNodeArray(
				table.header.rows,
				"table.header.rows",
				node,
			) as PreprocessedPdfNode[][];
		}

		const groups = alreadyNormalized ? [] : requireNodeArray(table.body, "table.body", node);
		const groupedRows: PreprocessedPdfNode[][] = [];
		const rowGroups: Array<{
			startRow: number;
			endRow: number;
			keepTogether: boolean;
			dontBreakRows: boolean;
		}> = [];
		for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
			const group = groups[groupIndex];
			if (!isObject(group)) {
				throw new Error(
					`Invalid table node: group ${groupIndex} in 'table.body' must be an object with a 'rows' array`,
				);
			}
			const groupRows = requireNodeArray(
				group.rows,
				`table.body[${groupIndex}].rows`,
				node,
			) as PreprocessedPdfNode[][];
			if (groupRows.length === 0) {
				throw new Error(
					`Invalid table node: 'table.body[${groupIndex}].rows' must contain at least one row`,
				);
			}
			for (const property of ["keepTogether", "dontBreakRows"] as const) {
				if (group[property] !== undefined && typeof group[property] !== "boolean") {
					throw new Error(
						`Invalid table row group ${groupIndex}: '${property}' must be a boolean, received ${stringifyNode(group[property])}`,
					);
				}
			}

			const startRow = headerRows.length + groupedRows.length;
			groupedRows.push(...groupRows);
			rowGroups.push({
				startRow,
				endRow: startRow + groupRows.length - 1,
				keepTogether: group.keepTogether === true,
				dontBreakRows: group.dontBreakRows === true,
			});
		}

		const body = alreadyNormalized
			? (table.body as PreprocessedPdfNode[][])
			: [...headerRows, ...groupedRows];
		if (body.length === 0) {
			throw new Error(`Invalid table node: table must contain at least one header or body row`);
		}
		if (!alreadyNormalized) {
			table.body = body;
			table.headerRows = headerRows.length;
			table._rowGroups = rowGroups;
			delete table.header;
		}
		for (let row = 0; row < body.length; row++) {
			if (!Array.isArray(body[row])) {
				throw new Error(`Invalid table node: row ${row} in 'table.body' must be an array`);
			}
			for (let col = 0; col < body[row].length; col++) {
				const cell = body[row][col];
				if (!isObject(cell)) continue;
				for (const property of ["colSpan", "rowSpan"] as const) {
					if (cell[property] !== undefined && !isPositiveInteger(cell[property])) {
						throw new Error(
							`Invalid table cell at row ${row}, column ${col}: '${property}' must be a positive integer, received ${stringifyNode(cell[property])}`,
						);
					}
				}
			}
		}
		const columnCount = body[0].length;
		const activeRowSpans = Array<number>(columnCount).fill(0);
		for (let row = 0; row < body.length; row++) {
			const rowData = body[row];
			const occupiedColumns = activeRowSpans.filter((remaining) => remaining > 0).length;
			const expandedLength = rowData.reduce(
				(total, cell) =>
					total + (isObject(cell) && isPositiveInteger(cell.colSpan) ? cell.colSpan : 1),
				0,
			);
			if (rowData.length < columnCount && expandedLength + occupiedColumns === columnCount) {
				const expandedRow: PreprocessedPdfNode[] = [];
				let sourceIndex = 0;
				for (let col = 0; col < columnCount; col++) {
					if (activeRowSpans[col] > 0) {
						expandedRow.push({ _span: true } as unknown as PreprocessedPdfNode);
						continue;
					}
					const cell = rowData[sourceIndex++];
					expandedRow.push(cell);
					const colSpan = isObject(cell) && isPositiveInteger(cell.colSpan) ? cell.colSpan : 1;
					for (let spanIndex = 1; spanIndex < colSpan; spanIndex++) {
						expandedRow.push({ _span: true } as unknown as PreprocessedPdfNode);
						col++;
					}
				}
				body[row] = expandedRow;
			}

			for (let col = 0; col < columnCount; col++) {
				activeRowSpans[col] = Math.max(0, activeRowSpans[col] - 1);
			}
			const normalizedRow = body[row];
			for (let col = 0; col < normalizedRow.length; col++) {
				const cell = normalizedRow[col];
				if (!isObject(cell) || cell._span || !isPositiveInteger(cell.rowSpan)) continue;
				const colSpan = isPositiveInteger(cell.colSpan) ? cell.colSpan : 1;
				for (let spanIndex = 0; spanIndex < colSpan; spanIndex++) {
					activeRowSpans[col + spanIndex] = Math.max(
						activeRowSpans[col + spanIndex],
						cell.rowSpan - 1,
					);
				}
			}
		}
		for (col = 0, cols = columnCount; col < cols; col++) {
			for (row = 0, rows = body.length; row < rows; row++) {
				const rowData = body[row];
				let data = rowData[col];
				if (data !== undefined) {
					if (!isObject(data) || !data._span) {
						rowData[col] = this.preprocessNode(data);
					}
				}
			}
		}

		return node;
	}

	preprocessText(node: PreprocessedPdfNode): PreprocessedPdfNode {
		if (node.tocItem) {
			if (!Array.isArray(node.tocItem)) {
				node.tocItem = [node.tocItem];
			}

			for (let i = 0, l = node.tocItem.length; i < l; i++) {
				if (!isString(node.tocItem[i])) {
					node.tocItem[i] = "_default_";
				}

				let tocItemId = node.tocItem[i];

				if (!this.tocs[tocItemId]) {
					this.tocs[tocItemId] = { toc: { _items: [], _pseudo: true } };
				}

				if (!node.id) {
					node.id = `toc-${tocItemId}-${this.tocs[tocItemId].toc!._items.length}`;
				}

				let tocItemRef = {
					_nodeRef: this._getNodeForNodeRef(node),
					_textNodeRef: node,
				};
				this.tocs[tocItemId].toc!._items.push(tocItemRef);
			}
		}

		if (node.id) {
			if (this.nodeReferences[node.id]) {
				if (!this.nodeReferences[node.id]._pseudo) {
					throw new Error(`Node id '${node.id}' already exists`);
				}

				this.nodeReferences[node.id]._nodeRef = this._getNodeForNodeRef(node);
				this.nodeReferences[node.id]._textNodeRef = node;
				this.nodeReferences[node.id]._pseudo = false;
			} else {
				this.nodeReferences[node.id] = {
					_nodeRef: this._getNodeForNodeRef(node),
					_textNodeRef: node,
				};
			}
		}

		if (node.pageReference) {
			if (!this.nodeReferences[node.pageReference]) {
				this.nodeReferences[node.pageReference] = {
					_nodeRef: {},
					_textNodeRef: {},
					_pseudo: true,
				};
			}
			node.text = "00000";
			node.linkToDestination = node.pageReference;
			node._pageRef = this.nodeReferences[node.pageReference];
		}

		if (node.textReference) {
			if (!this.nodeReferences[node.textReference]) {
				this.nodeReferences[node.textReference] = { _nodeRef: {}, _pseudo: true };
			}

			node.text = "";
			node.linkToDestination = node.textReference;
			node._textRef = this.nodeReferences[node.textReference];
		}

		if (isObject(node.text) && "text" in node.text) {
			node.text = [this.preprocessNode(node.text)];
		} else if (Array.isArray(node.text)) {
			let isSetParentNode = false;
			if (this.parentNode === null) {
				this.parentNode = node;
				isSetParentNode = true;
			}

			for (let i = 0, l = node.text.length; i < l; i++) {
				node.text[i] = this.preprocessNode(node.text[i]);
			}

			if (isSetParentNode) {
				this.parentNode = null;
			}
		}

		return node;
	}

	preprocessToc(node: PreprocessedPdfNode): PreprocessedPdfNode {
		const toc = node.toc!;
		if (!toc.id) {
			toc.id = "_default_";
		}

		toc.title = toc.title ? this.preprocessNode(toc.title) : null;
		toc._items = [];

		if (this.tocs[toc.id]) {
			if (!this.tocs[toc.id].toc!._pseudo) {
				throw new Error(`TOC '${toc.id}' already exists`);
			}

			toc._items = this.tocs[toc.id].toc!._items;
		}

		this.tocs[toc.id] = node;

		return node;
	}

	preprocessImage(node: PreprocessedPdfNode): PreprocessedPdfNode {
		const image = node.image;
		if (isObject(image) && image.type === "Buffer" && Array.isArray(image.data)) {
			node.image = Uint8Array.from(image.data);
		}
		return node;
	}

	preprocessCanvas(node: PreprocessedPdfNode): PreprocessedPdfNode {
		return node;
	}

	preprocessSVG(node: PreprocessedPdfNode): PreprocessedPdfNode {
		return node;
	}

	preprocessQr(node: PreprocessedPdfNode): PreprocessedPdfNode {
		return node;
	}

	preprocessAttachment(node: PreprocessedPdfNode): PreprocessedPdfNode {
		return node;
	}

	_getNodeForNodeRef(node: PreprocessedPdfNode): PreprocessedPdfNode {
		if (this.parentNode) {
			return this.parentNode;
		}

		return node;
	}
}

export default DocPreprocessor;
