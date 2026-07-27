const colors = {
	blue: "#2563eb",
	green: "#16a34a",
	orange: "#ea580c",
	purple: "#7c3aed",
	red: "#dc2626",
	slate: "#334155",
	lightBlue: "#dbeafe",
	lightGreen: "#dcfce7",
	lightOrange: "#ffedd5",
	lightPurple: "#ede9fe",
};

const contentFrame = (_currentPage, pageSize) => ({
	canvas: [
		{
			type: "rect",
			x: 40,
			y: 40,
			w: pageSize.width - 80,
			h: pageSize.height - 80,
			lineColor: colors.red,
			lineWidth: 0.75,
			dash: { length: 4, space: 3 },
		},
	],
});

const footer = (currentPage, pageCount) => ({
	text: `Page ${currentPage}/${pageCount} — the red dashed rectangle is the content boundary`,
	alignment: "center",
	fontSize: 8,
	color: colors.slate,
	margin: [0, 15, 0, 0],
});

const common = {
	pageMargins: [40, 40, 40, 40],
	background: contentFrame,
	footer,
	defaultStyle: { fontSize: 10, color: "#0f172a" },
	styles: {
		title: { fontSize: 20, bold: true, color: colors.slate, margin: [0, 0, 0, 12] },
		heading: { fontSize: 12, bold: true, color: colors.blue, margin: [0, 12, 0, 5] },
		note: { fontSize: 8, color: colors.slate, margin: [0, 3, 0, 5] },
	},
};

const tableLayout = {
	hLineColor: colors.slate,
	vLineColor: colors.slate,
	paddingLeft: () => 4,
	paddingRight: () => 4,
	paddingTop: () => 4,
	paddingBottom: () => 4,
};

const columnSizing = {
	...common,
	content: [
		{ text: "Visual check 1 — flexible column sizing", style: "title" },
		{ text: "Auto keeps its natural width; star receives the remainder", style: "heading" },
		{
			table: {
				widths: ["auto", "*"],
				body: {
					groups: [
						{
							rows: [
								[
									{ text: "AUTO LABEL", fillColor: colors.lightBlue },
									{
										text: "Star content takes all remaining space and wraps normally when it reaches the right edge.",
										fillColor: colors.lightGreen,
									},
								],
							],
						},
					],
					layout: tableLayout,
				},
			},
		},
		{
			text: "Expected: AUTO LABEL stays on one line; the green cell ends on the red guide.",
			style: "note",
		},
		{ text: "Long token in a fixed + star table", style: "heading" },
		{
			table: {
				widths: [150, "*"],
				body: {
					groups: [
						{
							rows: [
								[
									{ text: "150 pt", fillColor: colors.lightOrange },
									{ text: "[".repeat(180), fillColor: colors.lightPurple },
								],
							],
						},
					],
					layout: tableLayout,
				},
			},
		},
		{
			text: "Expected: every bracket remains inside the purple cell and content boundary.",
			style: "note",
		},
		{ text: "Three fixed columns plus one star column", style: "heading" },
		{
			table: {
				widths: [130, 130, 130, "*"],
				body: {
					groups: [
						{
							rows: [
								["130", "130", "130", { text: "STAR", fillColor: colors.lightBlue }],
								["One", "Another one", "OK?", "thisisareallylongstringblah"],
							],
						},
					],
					layout: tableLayout,
				},
			},
		},
		{
			text: "Expected: the final column is narrow but remains entirely inside the red guide.",
			style: "note",
		},
		{ text: "Equal star columns with asymmetric content", style: "heading" },
		{
			table: {
				widths: ["*", "*"],
				body: {
					groups: [
						{
							rows: [
								[
									{ text: "Short", fillColor: colors.lightGreen },
									{
										text: "fdafdsafdsafdafdsafdsa,".repeat(10),
										fillColor: colors.lightOrange,
									},
								],
							],
						},
					],
					layout: tableLayout,
				},
			},
		},
		{
			text: "Expected: both cells have the same width; the orange text wraps inside its cell.",
			style: "note",
		},
	],
};

const colspanSizing = {
	...common,
	pageOrientation: "landscape",
	content: [
		{ text: "Visual check 2 — colSpan sizing", style: "title" },
		{
			table: {
				widths: [40, 100, "*", 60, 60, 60, "auto", 30],
				body: {
					groups: [
						{
							rows: [
								[
									"Code",
									"Description",
									"Provider",
									"Range",
									"Approval",
									"Sent",
									{ text: "Units", fillColor: colors.lightBlue },
									"Type",
								],
								["1", "Consulting", "Acme", "03/01", "03/14", "03/16", "2.5", "Hour"],
								[
									{
										colSpan: 8,
										columns: [
											{ width: 75, text: "Justification:", bold: true },
											{
												width: "*",
												text: "A long wrapped explanation should expand the flexible provider area without making the compact Units column abnormally wide. ".repeat(
													4,
												),
											},
										],
										columnGap: 5,
										fillColor: colors.lightGreen,
									},
									{},
									{},
									{},
									{},
									{},
									{},
									{},
								],
							],
						},
					],
					layout: tableLayout,
				},
			},
		},
		{
			text: "Expected: Units remains only wide enough for its header/value. The green spanning row stays inside the table and red page guide.",
			style: "note",
		},
	],
};

const compactSpans = {
	...common,
	content: [
		{ text: "Visual check 3 — compact table spans", style: "title" },
		{ text: "Compact colSpan without manual empty placeholders", style: "heading" },
		{
			table: {
				widths: [45, "*", 55, 65, 65],
				body: {
					groups: [
						{
							rows: [
								["Qty", "Description", "Units", "Price", "Total"],
								["1", "Apple", "4", "0.30", "1.20"],
								[
									{ text: "SUM — spans the first four columns", colSpan: 4, alignment: "right" },
									"1.20",
								],
							],
						},
					],
					layout: tableLayout,
				},
			},
		},
		{
			text: "Expected: 1.20 remains visible in the fifth column and SUM occupies exactly columns 1–4.",
			style: "note",
		},
		{ text: "Combined compact rowSpan and colSpan", style: "heading" },
		{
			table: {
				widths: ["*", "*", "*", "*"],
				body: {
					groups: [
						{
							rows: [
								["A", "B", "C", "D"],
								[
									{ text: "1\nrowSpan 2", rowSpan: 2, fillColor: colors.lightBlue },
									{ text: "2 — colSpan 2", colSpan: 2, fillColor: colors.lightGreen },
									"3",
								],
								[{ text: "4 — fills B, C and D", colSpan: 3, fillColor: colors.lightOrange }],
							],
						},
					],
					layout: tableLayout,
				},
			},
		},
		{
			text: "Expected: blue cell covers A on both rows; green covers B–C; 3 stays in D; orange covers B–D on the last row.",
			style: "note",
		},
	],
};

const rowHeights = {
	...common,
	header: () => ({
		text: "Visual check 4 — explicit row heights",
		fontSize: 12,
		bold: true,
		color: colors.slate,
		margin: [40, 15, 40, 0],
	}),
	content: [
		{
			table: {
				widths: ["*"],
				heights: [200, 500, 70],
				body: {
					groups: [
						{
							rows: [
								[{ text: "ROW 1 — 200 pt", fillColor: colors.lightBlue }],
								[{ text: "ROW 2 — 500 pt", fillColor: colors.lightGreen }],
								[{ text: "ROW 3 — 70 pt; must start on page 2", fillColor: colors.lightOrange }],
							],
						},
					],
					layout: tableLayout,
				},
			},
		},
	],
};

const canvasPaths = {
	...common,
	content: [
		{ text: "Visual check 5 — canvas path offsets", style: "title" },
		{
			text: "The blue path is 7 pt wide and the red line is 1 pt wide. Correct alignment produces one red line centered inside a blue halo.",
			style: "note",
		},
		{
			margin: [25, 30, 0, 0],
			canvas: [
				{ type: "path", d: "M 10 10 L 310 10", lineColor: colors.blue, lineWidth: 7 },
				{ type: "line", x1: 10, y1: 10, x2: 310, y2: 10, lineColor: colors.red, lineWidth: 1 },
			],
		},
		{
			text: "Expected: no second detached blue or red line appears near the page origin or margin.",
			style: "note",
			margin: [0, 35, 0, 0],
		},
	],
};

const paginationBorders = {
	...common,
	content: [
		{ text: "Visual check 6 — table borders across page breaks", style: "title" },
		{
			text: "Part A: every page fragment must end with one 2 pt closing border. The intentionally borderless cells in the Open edge column must remain open.",
			style: "note",
		},
		{
			table: {
				header: {
					rows: [
						[
							{ text: "Description", bold: true, fillColor: colors.lightBlue },
							{ text: "Value", bold: true, fillColor: colors.lightBlue },
							{ text: "Open edge", bold: true, fillColor: colors.lightBlue },
						],
					],
					layout: {
						...tableLayout,
						hLineWhenBroken: true,
						hLineWidth: (index, node) =>
							index === 0 || index === 1 || index === node.table.body.length ? 2 : 0,
						vLineWidth: () => 1,
					},
				},

				widths: ["*", 90, 80],
				body: {
					groups: [
						{
							rows: [
								...Array.from({ length: 45 }, (_, index) => [
									`Pagination row ${index + 1}`,
									`${(index + 1) * 10}.00`,
									{
										text: "no bottom/right border",
										fontSize: 7,
										color: colors.slate,
										border: [false, false, false, false],
									},
								]),
							],
							dontBreakRows: true,
						},
					],
					layout: {
						...tableLayout,
						hLineWhenBroken: true,
						hLineWidth: (index, node) =>
							index === 0 || index === 1 || index === node.table.body.length ? 2 : 0,
						vLineWidth: () => 1,
					},
				},
			},
		},
		{
			text: "Part B — hLineWhenBroken: false",
			style: "heading",
			pageBreak: "before",
		},
		{
			text: "The long final row crosses a page. Its 3 pt final border must appear only at the real end of the table, never on an intermediate page.",
			style: "note",
		},
		{
			table: {
				widths: ["*", 80],
				body: {
					groups: [
						{
							rows: [
								["Long final row", "Status"],
								[
									{ text: "This content deliberately continues across the page. ".repeat(260) },
									"Final",
								],
							],
						},
					],
					layout: {
						...tableLayout,
						hLineWhenBroken: false,
						hLineWidth: (index, node) => (index === 0 || index === node.table.body.length ? 3 : 0),
						vLineWidth: () => 1,
					},
				},
			},
		},
	],
};

const roundedTableBorders = {
	...common,
	content: [
		{ text: "Visual check 7 — rounded table borders", style: "title" },
		{
			text: "The outer contour and corner fills are rounded. Internal separators remain straight.",
			style: "note",
		},
		{
			table: {
				borderRadius: 12,
				widths: ["*", 90],
				header: {
					rows: [["Description", "Amount"]],
					layout: {
						...tableLayout,
						fillColor: colors.lightBlue,
						hLineWidth: () => 1,
						vLineWidth: () => 1,
					},
				},
				body: {
					groups: [
						{
							rows: [
								["Rounded outer table", "120.00"],
								["Second row", "80.00"],
							],
						},
					],
					layout: {
						...tableLayout,
						fillColor: colors.lightGreen,
						hLineWidth: () => 1,
						vLineWidth: () => 1,
					},
				},
			},
		},
		{ text: "Rounded one-cell block", style: "heading" },
		{
			stack: [
				{ text: "Native decorated stack", bold: true },
				{ text: "Background, padding and border follow the same rounded contour." },
			],
			borderRadius: 10,
			borderWidth: 1.5,
			borderColor: colors.purple,
			backgroundColor: colors.lightPurple,
			padding: 10,
		},
		{ text: "Paginated rounded table", style: "heading", pageBreak: "before" },
		{
			text: "Every page fragment has four rounded corners, including the closing edge on the first page.",
			style: "note",
		},
		{
			table: {
				borderRadius: 9,
				widths: ["*", 80],
				body: {
					groups: [
						{
							dontBreakRows: true,
							rows: Array.from({ length: 42 }, (_, index) => [
								`Rounded pagination row ${index + 1}`,
								`${index + 1}.00`,
							]),
						},
					],
					layout: {
						...tableLayout,
						hLineWidth: () => 1,
						vLineWidth: () => 1,
					},
				},
			},
		},
	],
};

export const visualCases = [
	{ filename: "01-column-sizing.pdf", definition: columnSizing },
	{ filename: "02-colspan-sizing.pdf", definition: colspanSizing },
	{ filename: "03-compact-spans.pdf", definition: compactSpans },
	{ filename: "04-row-heights.pdf", definition: rowHeights },
	{ filename: "05-canvas-path-offset.pdf", definition: canvasPaths },
	{ filename: "06-table-pagination-borders.pdf", definition: paginationBorders },
	{ filename: "07-rounded-table-borders.pdf", definition: roundedTableBorders },
];
