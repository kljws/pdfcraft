import type { TableRowGroupLayout } from "../../types";
import type { PdfNode, PreprocessedPdfNode } from "../../types/internal";
import { stringifyNode, markNodeKind } from "../../utils/node";
import { isNumber, isObject, isPositiveInteger, isString } from "../../utils/variable-type";
import { normalizeTableBody } from "./table-body";
import type { PreprocessedTableNode } from "./table.types";

const ROW_GROUP_LAYOUT_PROPERTIES = new Set([
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

const requireNodeArray = (value: unknown, property: string, node: PdfNode): unknown[] => {
	if (!Array.isArray(value)) {
		throw new Error(
			`Invalid ${property} node: '${property}' must be an array, received ${stringifyNode(node)}`,
		);
	}
	return value;
};

const isValidTableWidth = (value: unknown): boolean =>
	(isNumber(value) && Number.isFinite(value) && value >= 0) ||
	(isString(value) &&
		(value === "auto" ||
			value === "*" ||
			value === "star" ||
			(/^\d+(?:\.\d+)?%$/.test(value) && Number.parseFloat(value) >= 0)));

export interface TablePreprocessContext {
	allowSections: boolean;
	preprocessNode(input: unknown, isSectionAllowed?: boolean): PreprocessedPdfNode;
}

export function preprocessTable(
	node: PdfNode,
	context: TablePreprocessContext,
): PreprocessedTableNode {
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
			if (!ROW_GROUP_LAYOUT_PROPERTIES.has(property)) {
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
		throw new Error("Invalid table node: table must contain at least one header or body row");
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
		for (let column = 0; column < body[row].length; column++) {
			const cell = body[row][column];
			if (!isObject(cell)) continue;
			for (const property of ["colSpan", "rowSpan"] as const) {
				if (cell[property] !== undefined && !isPositiveInteger(cell[property])) {
					throw new Error(
						`Invalid table cell at row ${row}, column ${column}: '${property}' must be a positive integer, received ${stringifyNode(cell[property])}`,
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
	for (let column = 0; column < columnCount; column++) {
		for (let row = 0; row < body.length; row++) {
			const rowData = body[row];
			const data = rowData[column];
			if (data !== undefined && (!isObject(data) || !data._span)) {
				rowData[column] = context.preprocessNode(
					data,
					table._blockContainer === true && context.allowSections,
				);
			}
		}
	}

	return markNodeKind(node, "table");
}
