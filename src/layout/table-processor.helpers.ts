import { PAGE_BREAK_VALUES } from "./table-processor.constants";
import type { ColumnWidth, LayoutPdfNode, PdfPage, PdfTable, Vector } from "../types/internal";
import { trackVectorInsertion } from "./element-writer";
import type {
	ResolvedTableLayout,
	RowSpanData,
	TablePageVectorRegistry,
	TableProcessorState,
} from "./table-processor.types";

export type TableVectorRole =
	"horizontal" | "leftVertical" | "rightVertical" | "leftFill" | "rightFill";

export const requireTable = (tableNode: LayoutPdfNode): PdfTable<LayoutPdfNode> => {
	const table = tableNode.table;
	if (!table) throw new Error("Internal layout error: expected a preprocessed table node");
	return table;
};

const getPageVectorRegistry = (
	processor: TableProcessorState,
	page: PdfPage,
): TablePageVectorRegistry => {
	let registry = processor.vectorRegistryByPage.get(page);
	if (!registry) {
		registry = {
			horizontalItems: new Set(),
			leftVerticals: new Set(),
			rightVerticals: new Set(),
			leftFills: new Set(),
			rightFills: new Set(),
		};
		processor.vectorRegistryByPage.set(page, registry);
	}
	return registry;
};

export const trackTableVector = (
	processor: TableProcessorState,
	vector: Vector,
	roles: TableVectorRole[],
	group?: object,
): void => {
	trackVectorInsertion(vector, (_pageIndex, page, pageItem) => {
		const registry = getPageVectorRegistry(processor, page);
		for (const role of roles) {
			switch (role) {
				case "horizontal":
					if (registry.horizontalGroup !== group) {
						registry.horizontalGroup = group;
						registry.horizontalItems.clear();
					}
					registry.horizontalItems.add(pageItem);
					break;
				case "leftVertical":
					registry.leftVerticals.add(pageItem);
					break;
				case "rightVertical":
					registry.rightVerticals.add(pageItem);
					break;
				case "leftFill":
					if (registry.leftFillGroup !== group) {
						registry.leftFillGroup = group;
						registry.leftFills.clear();
					}
					registry.leftFills.add(pageItem);
					break;
				case "rightFill":
					if (registry.rightFillGroup !== group) {
						registry.rightFillGroup = group;
						registry.rightFills.clear();
					}
					registry.rightFills.add(pageItem);
					break;
			}
		}
	});
};

export const hasExplicitPageBreak = (cell: LayoutPdfNode): boolean => {
	if (!cell || typeof cell !== "object") {
		return false;
	}

	return typeof cell.pageBreak === "string" && PAGE_BREAK_VALUES.has(cell.pageBreak);
};

export const getTableInnerContentWidth = (tableNode: LayoutPdfNode): number =>
	requireTable(tableNode).widths.reduce((width: number, column: ColumnWidth) => {
		return width + (column._calcWidth ?? column._minWidth);
	}, 0);

export type CornerRadii = [
	topLeft: number,
	topRight: number,
	bottomRight: number,
	bottomLeft: number,
];

export const createRoundedRectanglePath = (
	width: number,
	height: number,
	radii: CornerRadii,
): string => {
	let [topLeft, topRight, bottomRight, bottomLeft] = radii.map((radius) =>
		Math.max(0, radius),
	) as CornerRadii;
	const scales = [
		topLeft + topRight > 0 ? width / (topLeft + topRight) : 1,
		bottomLeft + bottomRight > 0 ? width / (bottomLeft + bottomRight) : 1,
		topLeft + bottomLeft > 0 ? height / (topLeft + bottomLeft) : 1,
		topRight + bottomRight > 0 ? height / (topRight + bottomRight) : 1,
	];
	const scale = Math.min(1, ...scales);
	topLeft *= scale;
	topRight *= scale;
	bottomRight *= scale;
	bottomLeft *= scale;

	return [
		`M ${topLeft} 0`,
		`H ${width - topRight}`,
		`Q ${width} 0 ${width} ${topRight}`,
		`V ${height - bottomRight}`,
		`Q ${width} ${height} ${width - bottomRight} ${height}`,
		`H ${bottomLeft}`,
		`Q 0 ${height} 0 ${height - bottomLeft}`,
		`V ${topLeft}`,
		`Q 0 0 ${topLeft} 0`,
		"Z",
	].join(" ");
};

export const createRowSpanData = (
	tableNode: LayoutPdfNode,
	layout: ResolvedTableLayout,
	horizontalOffset = 0,
): RowSpanData[] => {
	const data: RowSpanData[] = [{ left: horizontalOffset, rowSpan: 0 }];
	let left = horizontalOffset;
	const table = requireTable(tableNode);

	for (let index = 0; index < table.body[0].length; index++) {
		const padding = layout.paddingLeft(index, tableNode) + layout.paddingRight(index, tableNode);
		const width =
			padding + layout.vLineWidth(index, tableNode) + (table.widths[index]._calcWidth ?? 0);
		data[data.length - 1].width = width;
		left += width;
		data.push({ left, rowSpan: 0, width: 0 });
	}

	return data;
};

export const propagateCellBorders = (body: LayoutPdfNode[][]): void => {
	const setBorder = (
		rowIndex: number,
		columnIndex: number,
		borderIndex: number,
		value: boolean,
	): void => {
		const cell = body[rowIndex][columnIndex];
		cell.border ||= [true, true, true, true];
		cell.border[borderIndex] = value;
	};

	for (let rowIndex = 0; rowIndex < body.length; rowIndex++) {
		for (let columnIndex = 0; columnIndex < body[rowIndex].length; columnIndex++) {
			const cell = body[rowIndex][columnIndex];
			if (!cell.border) continue;

			const rowSpan = cell.rowSpan || 1;
			const columnSpan = cell.colSpan || 1;
			for (let rowOffset = 0; rowOffset < rowSpan; rowOffset++) {
				if (cell.border[0] !== undefined && rowOffset > 0) {
					setBorder(rowIndex + rowOffset, columnIndex, 0, cell.border[0]);
				}
				if (cell.border[2] !== undefined) {
					setBorder(rowIndex + rowOffset, columnIndex + columnSpan - 1, 2, cell.border[2]);
				}
			}

			for (let columnOffset = 0; columnOffset < columnSpan; columnOffset++) {
				if (cell.border[1] !== undefined && columnOffset > 0) {
					setBorder(rowIndex, columnIndex + columnOffset, 1, cell.border[1]);
				}
				if (cell.border[3] !== undefined) {
					setBorder(rowIndex + rowSpan - 1, columnIndex + columnOffset, 3, cell.border[3]);
				}
			}
		}
	}
};
