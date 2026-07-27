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
import type { TableRowGroupLayout } from "../types";

const TABLE_ROW_GROUP_LAYOUT_PROPERTIES = new Set([
	"hLineWidth",
	"vLineWidth",
	"hLineColor",
	"vLineColor",
	"paddingLeft",
	"paddingRight",
	"paddingTop",
	"paddingBottom",
	"hLineStyle",
	"vLineStyle",
]);

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

type ResolvedBlockPadding = [left: number, top: number, right: number, bottom: number];

const resolveBlockPadding = (value: unknown): ResolvedBlockPadding => {
	const values = isNumber(value)
		? [value, value, value, value]
		: Array.isArray(value) && value.length === 2
			? [value[0], value[1], value[0], value[1]]
			: Array.isArray(value) && value.length === 4
				? value
				: null;
	if (!values || !values.every((item) => isNumber(item) && Number.isFinite(item) && item >= 0)) {
		throw new Error(
			`Invalid stack node: 'padding' must be a finite non-negative number or a two/four-number array, received ${stringifyNode(value)}`,
		);
	}
	return values as ResolvedBlockPadding;
};

const isColor = (value: unknown): boolean =>
	isString(value) ||
	(Array.isArray(value) && value.length === 2 && value.every((part) => isString(part)));

const isSpanPlaceholder = (value: unknown): boolean =>
	(isObject(value) && (value._span === true || isEmptyObject(value))) ||
	value === "" ||
	!isValue(value);

const getCellSpan = (cell: unknown): number =>
	isObject(cell) && isPositiveInteger(cell.colSpan) ? cell.colSpan : 1;

const normalizeTableBody = (body: PreprocessedPdfNode[][]): number => {
	const columnCount = body[0].length;
	if (columnCount === 0) {
		throw new Error("Invalid table node: table rows must contain at least one cell");
	}

	let activeRowSpans = Array<number>(columnCount).fill(0);
	for (let rowIndex = 0; rowIndex < body.length; rowIndex++) {
		const sourceRow = body[rowIndex];
		const normalizedRow: PreprocessedPdfNode[] = [];
		let sourceIndex = 0;
		const usesExplicitSlots = sourceRow.length === columnCount;
		if (sourceRow.length > columnCount) {
			throw new Error(
				`Invalid table row ${rowIndex}: resolves to more than ${columnCount} columns`,
			);
		}

		for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
			if (activeRowSpans[columnIndex] > 0) {
				if (usesExplicitSlots || isSpanPlaceholder(sourceRow[sourceIndex])) sourceIndex++;
				normalizedRow.push({ _span: true } as unknown as PreprocessedPdfNode);
				continue;
			}

			if (sourceIndex >= sourceRow.length) {
				throw new Error(
					`Invalid table row ${rowIndex}: resolves to fewer than ${columnCount} columns`,
				);
			}
			const cell = sourceRow[sourceIndex++];
			if (isObject(cell) && cell._span === true) {
				throw new Error(
					`Invalid table cell at row ${rowIndex}, column ${columnIndex}: span placeholder has no active span`,
				);
			}
			const colSpan = getCellSpan(cell);
			if (columnIndex + colSpan > columnCount) {
				throw new Error(
					`Invalid table cell at row ${rowIndex}, column ${columnIndex}: 'colSpan' exceeds the table's ${columnCount} columns`,
				);
			}
			for (let spanIndex = 0; spanIndex < colSpan; spanIndex++) {
				if (activeRowSpans[columnIndex + spanIndex] > 0) {
					throw new Error(
						`Invalid table cell at row ${rowIndex}, column ${columnIndex}: 'colSpan' overlaps an active rowSpan`,
					);
				}
			}

			normalizedRow.push(cell);
			for (let spanIndex = 1; spanIndex < colSpan; spanIndex++) {
				if (usesExplicitSlots || isSpanPlaceholder(sourceRow[sourceIndex])) sourceIndex++;
				normalizedRow.push({ _span: true } as unknown as PreprocessedPdfNode);
				columnIndex++;
			}
		}

		if (sourceIndex < sourceRow.length) {
			throw new Error(
				`Invalid table row ${rowIndex}: resolves to more than ${columnCount} columns`,
			);
		}

		const nextRowSpans = activeRowSpans.map((remaining) => Math.max(0, remaining - 1));
		for (let columnIndex = 0; columnIndex < normalizedRow.length; columnIndex++) {
			const cell = normalizedRow[columnIndex];
			if (!isObject(cell) || cell._span || !isPositiveInteger(cell.rowSpan)) continue;
			if (rowIndex + cell.rowSpan > body.length) {
				throw new Error(
					`Invalid table cell at row ${rowIndex}, column ${columnIndex}: 'rowSpan' exceeds the table's ${body.length} rows`,
				);
			}
			const colSpan = getCellSpan(cell);
			for (let spanIndex = 0; spanIndex < colSpan; spanIndex++) {
				nextRowSpans[columnIndex + spanIndex] = Math.max(
					nextRowSpans[columnIndex + spanIndex],
					cell.rowSpan - 1,
				);
			}
		}

		body[rowIndex] = normalizedRow;
		activeRowSpans = nextRowSpans;
	}

	return columnCount;
};

const isValidTableWidth = (value: unknown): boolean =>
	(isNumber(value) && Number.isFinite(value) && value >= 0) ||
	(isString(value) &&
		(value === "auto" ||
			value === "*" ||
			value === "star" ||
			(/^\d+(?:\.\d+)?%$/.test(value) && Number.parseFloat(value) >= 0)));

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
			const block = node as unknown as Record<string, unknown>;
			const hasBlockDecoration = ["borderRadius", "borderWidth", "backgroundColor", "padding"].some(
				(property) => block[property] !== undefined,
			);
			return hasBlockDecoration
				? this.preprocessDecoratedVerticalContainer(node, isSectionAllowed)
				: this.preprocessVerticalContainer(node, isSectionAllowed);
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

	preprocessDecoratedVerticalContainer(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean,
	): PreprocessedPdfNode {
		const block = node as unknown as Record<string, unknown>;
		for (const property of ["borderRadius", "borderWidth"] as const) {
			const value = block[property];
			if (value !== undefined && (!isNumber(value) || !Number.isFinite(value) || value < 0)) {
				throw new Error(
					`Invalid stack node: '${property}' must be a finite non-negative number, received ${stringifyNode(value)}`,
				);
			}
		}
		for (const property of ["borderColor", "backgroundColor"] as const) {
			const value = block[property];
			if (value !== undefined && !isColor(value)) {
				throw new Error(
					`Invalid stack node: '${property}' must be a color, received ${stringifyNode(value)}`,
				);
			}
		}

		const borderRadius = (block.borderRadius as number | undefined) ?? 0;
		const borderWidth = (block.borderWidth as number | undefined) ?? 0;
		const borderColor = block.borderColor ?? "black";
		const backgroundColor = block.backgroundColor;
		const padding = block.padding === undefined ? [0, 0, 0, 0] : resolveBlockPadding(block.padding);
		const content = node.stack;
		if (!content) throw new Error("Internal preprocessing error: expected a stack node");
		const layout = {
			hLineWidth: (index: number, tableNode: PreprocessedPdfNode) =>
				index === 0 || index === (tableNode.table?.body.length ?? 0) ? borderWidth : 0,
			vLineWidth: (index: number, tableNode: PreprocessedPdfNode) =>
				index === 0 || index === (tableNode.table?.body[0]?.length ?? 0) ? borderWidth : 0,
			hLineColor: borderColor,
			vLineColor: borderColor,
			paddingLeft: () => padding[0],
			paddingTop: () => padding[1],
			paddingRight: () => padding[2],
			paddingBottom: () => padding[3],
			fillColor: backgroundColor,
		};

		node.table = {
			borderRadius,
			widths: ["*"],
			body: {
				groups: [{ rows: [[{ stack: content }]] }],
				layout,
			},
			_blockContainer: true,
		} as unknown as PreprocessedPdfNode["table"];
		delete node.stack;
		for (const property of [
			"borderRadius",
			"borderWidth",
			"borderColor",
			"backgroundColor",
			"padding",
		]) {
			delete block[property];
		}

		return this.preprocessTable(node, isSectionAllowed);
	}

	preprocessList(node: PreprocessedPdfNode): PreprocessedPdfNode {
		const property = node.ul ? "ul" : "ol";
		const items = requireNodeArray(node[property], property, node) as PreprocessedPdfNode[];

		for (let i = 0, l = items.length; i < l; i++) {
			items[i] = this.preprocessNode(items[i]);
		}

		return node;
	}

	preprocessTable(
		node: PreprocessedPdfNode,
		isSectionAllowed: boolean = false,
	): PreprocessedPdfNode {
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
			if (
				table.borderRadius !== undefined &&
				(!isNumber(table.borderRadius) ||
					!Number.isFinite(table.borderRadius) ||
					table.borderRadius < 0)
			) {
				throw new Error(
					`Invalid table node: 'table.borderRadius' must be a finite non-negative number, received ${stringifyNode(table.borderRadius)}`,
				);
			}
			if (node.layout !== undefined) {
				throw new Error(
					"Invalid table node: node-level 'layout' is no longer supported; use 'table.header.layout' and 'table.body.layout' instead",
				);
			}
			for (const legacyProperty of ["headerRows", "keepWithHeaderRows", "dontBreakRows"]) {
				if (legacyProperty in table) {
					throw new Error(
						`Invalid table node: '${legacyProperty}' is no longer supported; use 'table.header.rows' and grouped 'table.body[].rows' instead`,
					);
				}
			}
			if (table.widths !== undefined) {
				const widths = Array.isArray(table.widths) ? table.widths : [table.widths];
				if (widths.length === 0) {
					throw new Error("Invalid table node: 'table.widths' must not be an empty array");
				}
				for (let index = 0; index < widths.length; index++) {
					if (!isValidTableWidth(widths[index])) {
						throw new Error(
							`Invalid table node: 'table.widths[${index}]' must be a finite non-negative number, 'auto', '*', 'star' or a percentage, received ${stringifyNode(widths[index])}`,
						);
					}
				}
			}
			if (table.heights !== undefined) {
				const heights = Array.isArray(table.heights) ? table.heights : [table.heights];
				const valid =
					typeof table.heights === "function" ||
					heights.every(
						(height) =>
							height === "auto" || (isNumber(height) && Number.isFinite(height) && height >= 0),
					);
				if (!valid) {
					throw new Error(
						`Invalid table node: 'table.heights' must contain only finite non-negative numbers or 'auto', received ${stringifyNode(table.heights)}`,
					);
				}
			}
		}

		let headerRows: PreprocessedPdfNode[][] = [];
		let headerLayout: unknown;
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
			headerLayout = table.header.layout;
		}

		let bodyLayout: unknown;
		let groups: unknown[] = [];
		if (!alreadyNormalized) {
			if (!isObject(table.body)) {
				throw new Error(
					`Invalid table.body node: 'table.body' must be an object with a 'groups' array, received ${stringifyNode(table.body)}`,
				);
			}
			groups = requireNodeArray(table.body.groups, "table.body.groups", node);
			bodyLayout = table.body.layout;
		}
		for (const [property, layout] of [
			["table.header.layout", headerLayout],
			["table.body.layout", bodyLayout],
		] as const) {
			if (layout !== undefined && !isString(layout) && !isObject(layout)) {
				throw new Error(
					`Invalid table node: '${property}' must be a layout name or object, received ${stringifyNode(layout)}`,
				);
			}
		}
		const groupedRows: PreprocessedPdfNode[][] = [];
		const rowGroups: Array<{
			groupIndex: number;
			startRow: number;
			endRow: number;
			keepTogether: boolean;
			dontBreakRows: boolean;
			layoutDefinition?: TableRowGroupLayout;
		}> = [];
		for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
			const group = groups[groupIndex];
			if (!isObject(group)) {
				throw new Error(
					`Invalid table node: group ${groupIndex} in 'table.body.groups' must be an object with a 'rows' array`,
				);
			}
			const groupRows = requireNodeArray(
				group.rows,
				`table.body.groups[${groupIndex}].rows`,
				node,
			) as PreprocessedPdfNode[][];
			if (groupRows.length === 0) {
				throw new Error(
					`Invalid table node: 'table.body.groups[${groupIndex}].rows' must contain at least one row`,
				);
			}
			for (const property of ["keepTogether", "dontBreakRows"] as const) {
				if (group[property] !== undefined && typeof group[property] !== "boolean") {
					throw new Error(
						`Invalid table row group ${groupIndex}: '${property}' must be a boolean, received ${stringifyNode(group[property])}`,
					);
				}
			}
			if (group.layout !== undefined && !isObject(group.layout)) {
				throw new Error(
					`Invalid table row group ${groupIndex}: 'layout' must be an object, received ${stringifyNode(group.layout)}`,
				);
			}
			for (const property of Object.keys(group.layout ?? {})) {
				if (!TABLE_ROW_GROUP_LAYOUT_PROPERTIES.has(property)) {
					throw new Error(
						`Invalid table row group ${groupIndex}: unsupported layout property '${property}'`,
					);
				}
			}

			const startRow = headerRows.length + groupedRows.length;
			groupedRows.push(...groupRows);
			rowGroups.push({
				groupIndex,
				startRow,
				endRow: startRow + groupRows.length - 1,
				keepTogether: group.keepTogether === true,
				dontBreakRows: group.dontBreakRows === true,
				layoutDefinition: group.layout as TableRowGroupLayout | undefined,
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
			table._headerLayout = headerLayout;
			table._bodyLayout = bodyLayout;
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
		const columnCount = normalizeTableBody(body);
		if (!alreadyNormalized && Array.isArray(table.widths) && table.widths.length > columnCount) {
			throw new Error(
				`Invalid table node: 'table.widths' defines ${table.widths.length} columns but table rows define ${columnCount}`,
			);
		}
		for (col = 0, cols = columnCount; col < cols; col++) {
			for (row = 0, rows = body.length; row < rows; row++) {
				const rowData = body[row];
				let data = rowData[col];
				if (data !== undefined) {
					if (!isObject(data) || !data._span) {
						rowData[col] = this.preprocessNode(
							data,
							table._blockContainer === true && isSectionAllowed,
						);
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
				const toc = this.tocs[tocItemId].toc;
				if (!toc) throw new Error(`Internal preprocessing error: missing TOC '${tocItemId}'`);

				if (!node.id) {
					node.id = `toc-${tocItemId}-${toc._items.length}`;
				}

				let tocItemRef = {
					_nodeRef: this._getNodeForNodeRef(node),
					_textNodeRef: node,
				};
				toc._items.push(tocItemRef);
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
		const toc = node.toc;
		if (!toc) throw new Error("Internal preprocessing error: expected a TOC node");
		if (!toc.id) {
			toc.id = "_default_";
		}

		toc.title = toc.title ? this.preprocessNode(toc.title) : null;
		toc._items = [];

		if (this.tocs[toc.id]) {
			const registeredToc = this.tocs[toc.id].toc;
			if (!registeredToc) throw new Error(`Internal preprocessing error: missing TOC '${toc.id}'`);
			if (!registeredToc._pseudo) {
				throw new Error(`TOC '${toc.id}' already exists`);
			}

			toc._items = registeredToc._items;
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
