/**
 * Representative documents used as a stable comparison set for layout and rendering changes.
 * Each document exercises several features together so that a change in one area that affects
 * another shows up in the reference snapshots.
 */

const paragraph = (words: number, prefix = "word"): string =>
	Array.from({ length: words }, (_, index) => `${prefix}${index}`).join(" ");

const rows = (count: number, columns: number): string[][] =>
	Array.from({ length: count }, (_, row) =>
		Array.from({ length: columns }, (_, column) => `r${row}c${column}`),
	);

export const SAMPLE_IMAGE = "examples/images/sampleImage.jpg";

export interface ReferenceDocument {
	/** Text that must appear in the extracted PDF text, in reading order. */
	expectedText: string[];
	definition: Record<string, unknown>;
}

export const referenceDocuments: Record<string, ReferenceDocument> = {
	"text and styles": {
		expectedText: ["Reference title", "word0 word1", "bold", "italic"],
		definition: {
			content: [
				{ text: "Reference title", fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
				{ text: paragraph(120) },
				{
					text: [
						"Mixed ",
						{ text: "bold", bold: true },
						" and ",
						{ text: "italic", italics: true },
					],
				},
				{ text: paragraph(900, "flow"), alignment: "justify" },
			],
		},
	},

	images: {
		expectedText: ["Before image", "After image"],
		definition: {
			content: [
				"Before image",
				{ image: SAMPLE_IMAGE, width: 200 },
				{ image: SAMPLE_IMAGE, fit: [100, 100], alignment: "center" },
				{ text: paragraph(500) },
				{ image: SAMPLE_IMAGE, width: 400 },
				"After image",
			],
		},
	},

	tables: {
		expectedText: ["H1", "r0c0", "r79c2"],
		definition: {
			content: [
				{
					table: {
						widths: [80, "*", "auto"],
						header: { rows: [["H1", "H2", "H3"]] },
						body: { groups: [{ rows: rows(80, 3) }] },
					},
				},
				{
					table: {
						widths: ["*", "*"],
						body: {
							layout: "lightHorizontalLines",
							groups: [
								{
									rows: [
										[{ text: "span", colSpan: 2 }, ""],
										[{ text: "rows", rowSpan: 2 }, "a"],
										["", "b"],
									],
								},
							],
						},
					},
				},
			],
		},
	},

	"columns and lists": {
		expectedText: ["Left column", "Right column", "item 1", "numbered 1"],
		definition: {
			content: [
				{
					columns: [
						{ width: "*", text: ["Left column ", paragraph(150)] },
						{ width: 150, text: ["Right column ", paragraph(60)] },
					],
					columnGap: 10,
				},
				{ ul: Array.from({ length: 30 }, (_, index) => `item ${index + 1}`) },
				{ ol: Array.from({ length: 30 }, (_, index) => `numbered ${index + 1}`) },
			],
		},
	},

	"headers footers and references": {
		expectedText: ["Contents", "Chapter one", "Chapter two", "See page", "Page 4 of"],
		definition: {
			header: { text: "Header", alignment: "right", margin: [40, 10, 40, 0] },
			footer: (currentPage: number, pageCount: number) => ({
				text: `Page ${currentPage} of ${pageCount}`,
				alignment: "center",
			}),
			content: [
				{ toc: { title: { text: "Contents" } } },
				{ text: "Chapter one", id: "one", tocItem: true, fontSize: 16, pageBreak: "before" },
				{ text: paragraph(700) },
				{ text: "Chapter two", id: "two", tocItem: true, fontSize: 16, pageBreak: "before" },
				{ text: paragraph(300) },
				{ text: ["See page ", { pageReference: "two" }, " for ", { textReference: "two" }] },
			],
		},
	},
};
