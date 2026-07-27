# PDFCraft Styling Guide

This guide documents the styling and layout controls exposed by PDFCraft's TypeScript API. It has been reviewed against the latest supplied production sources.

> Revision note: the public styling types are unchanged in this source update. The layout engine now handles oversized text lines and QR codes on an empty page more safely, avoiding repeated page-break attempts.

## Table of contents

1. [Styling model](#styling-model)
2. [Complete example](#complete-example)
3. [Reusable styles](#reusable-styles)
4. [Text and typography](#text-and-typography)
5. [Spacing and positioning](#spacing-and-positioning)
6. [Pages and sections](#pages-and-sections)
7. [Stacks and decorated blocks](#stacks-and-decorated-blocks)
8. [Columns](#columns)
9. [Lists](#lists)
10. [Tables](#tables)
11. [Images](#images)
12. [SVG](#svg)
13. [QR codes](#qr-codes)
14. [Canvas and vector graphics](#canvas-and-vector-graphics)
15. [Headers, footers, backgrounds, and watermarks](#headers-footers-backgrounds-and-watermarks)
16. [Links, references, TOC, and outlines](#links-references-toc-and-outlines)
17. [Forms](#forms)
18. [Fonts](#fonts)
19. [Style property reference](#style-property-reference)
20. [Compatibility with the latest supplied source](#compatibility-with-the-latest-supplied-source)
21. [Practical patterns](#practical-patterns)

---

## Styling model

PDFCraft provides three complementary styling levels:

1. `defaultStyle` defines document-wide defaults.
2. `styles` defines reusable named styles.
3. Properties placed directly on a content node override inherited values.

```ts
import type { DocumentDefinition } from "pdfcraft";

const doc: DocumentDefinition = {
  defaultStyle: {
    font: "Roboto",
    fontSize: 10,
    color: "#1f2937",
    lineHeight: 1.25,
  },

  styles: {
    title: {
      fontSize: 28,
      bold: true,
      color: "#111827",
      marginBottom: 16,
    },
    muted: {
      color: "#6b7280",
      fontSize: 9,
    },
  },

  content: [
    { text: "Document title", style: "title" },
    { text: "Reusable muted text", style: "muted" },
    {
      text: "Named style plus a local override",
      style: "muted",
      color: "#dc2626",
    },
  ],
};
```

A node may use one style, several styles, or an inline style object:

```ts
{
  text: "Combined styles",
  style: ["body", "important"]
}

{
  text: "Inline style",
  style: {
    bold: true,
    color: "#2563eb"
  }
}
```

Named styles can inherit from other named styles with `extends`:

```ts
styles: {
  body: {
    fontSize: 10,
    lineHeight: 1.3,
  },
  warning: {
    extends: "body",
    bold: true,
    color: "#b91c1c",
  },
  warningCentered: {
    extends: ["body", "warning"],
    alignment: "center",
  },
}
```

---

## Complete example

```ts
import pdfcraft from "pdfcraft";
import type { DocumentDefinition } from "pdfcraft";

const docDefinition: DocumentDefinition = {
  pageSize: "A4",
  pageOrientation: "portrait",
  pageMargins: [48, 56, 48, 56],

  defaultStyle: {
    font: "Roboto",
    fontSize: 10,
    color: "#1f2937",
    lineHeight: 1.25,
  },

  styles: {
    title: {
      fontSize: 26,
      bold: true,
      color: "#0f172a",
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 11,
      color: "#64748b",
      marginBottom: 24,
    },
    heading: {
      fontSize: 15,
      bold: true,
      color: "#1d4ed8",
      marginTop: 14,
      marginBottom: 8,
    },
    tableHeader: {
      bold: true,
      color: "#ffffff",
      fillColor: "#1d4ed8",
      margin: [6, 5],
    },
  },

  header: (currentPage, pageCount) => ({
    text: `PDFCraft styling guide — ${currentPage}/${pageCount}`,
    alignment: "right",
    color: "#94a3b8",
    fontSize: 8,
    margin: [0, 20, 40, 0],
  }),

  footer: {
    text: "Generated with PDFCraft",
    alignment: "center",
    color: "#94a3b8",
    fontSize: 8,
  },

  background: (currentPage, pageSize) => ({
    canvas: [
      {
        type: "line",
        x1: 40,
        y1: pageSize.height - 42,
        x2: pageSize.width - 40,
        y2: pageSize.height - 42,
        lineWidth: 0.5,
        lineColor: "#cbd5e1",
      },
    ],
  }),

  content: [
    { text: "Styling PDFCraft", style: "title" },
    { text: "Typography, layout, media, tables and vectors", style: "subtitle" },

    {
      stack: [
        { text: "Callout", bold: true, color: "#1e3a8a" },
        {
          text: "Stacks can have a background, border, radius and padding.",
          marginTop: 4,
        },
      ],
      backgroundColor: "#eff6ff",
      borderColor: "#93c5fd",
      borderWidth: 1,
      borderRadius: 8,
      padding: [12, 10],
      marginBottom: 18,
    },

    { text: "Two-column layout", style: "heading" },
    {
      columns: [
        {
          width: "35%",
          stack: [
            { text: "Sidebar", bold: true },
            { text: "Fixed percentage width", color: "#64748b" },
          ],
        },
        {
          width: "*",
          text: "The star column receives the remaining available width.",
        },
      ],
      columnGap: 18,
    },

    { text: "Table", style: "heading" },
    {
      table: {
        header: {
          rows: [[
            { text: "Feature", style: "tableHeader" },
            { text: "Supported", style: "tableHeader" },
          ]],
          layout: "noBorders",
        },
        body: {
          groups: [
            {
              rows: [
                ["Named styles", "Yes"],
                ["Custom table layouts", "Yes"],
                ["Vector graphics", "Yes"],
              ],
            },
          ],
          layout: "lightHorizontalLines",
        },
        widths: ["*", "auto"],
        borderRadius: 6,
      },
      marginTop: 6,
    },
  ],
};

const pdf = pdfcraft.createPdf(docDefinition);
```

---

## Reusable styles

The `Style` interface supports typography, spacing, colors, links, table-cell appearance, and more.

```ts
styles: {
  base: {
    font: "Roboto",
    fontSize: 10,
    lineHeight: 1.3,
  },
  heading: {
    extends: "base",
    fontSize: 18,
    bold: true,
    color: "#172554",
    margin: [0, 14, 0, 8],
  },
  highlighted: {
    background: "#fef3c7",
    color: "#92400e",
    decoration: "underline",
    decorationColor: "#f59e0b",
  },
}
```

### Style precedence

A useful mental model is:

```text
defaultStyle → inherited named styles → later combined styles → node properties
```

Use direct node properties for one-off changes and named styles for repeated visual rules.

---

## Text and typography

### Font and emphasis

```ts
{
  text: "Typography",
  font: "Roboto",
  fontSize: 16,
  bold: true,
  italics: true,
}
```

Available properties:

- `font`
- `fontSize`
- `bold`
- `italics`
- `fontFeatures`
- `sup`
- `sub`

```ts
{
  text: [
    "H",
    { text: "2", sub: true },
    "O and x",
    { text: "2", sup: true },
  ]
}
```

### Rich inline text

The `text` property accepts an array of differently styled fragments:

```ts
{
  text: [
    { text: "Bold", bold: true },
    " normal ",
    { text: "italic", italics: true },
    " and ",
    { text: "blue", color: "#2563eb" },
  ],
}
```

### Alignment

```ts
{ text: "Left", alignment: "left" }
{ text: "Centered", alignment: "center" }
{ text: "Right", alignment: "right" }
{ text: "Justified paragraph", alignment: "justify" }
```

A table as a whole can additionally use:

```ts
{ table: { /* ... */ }, tableAlignment: "center" }
```

### Color and background

```ts
{
  text: "Colored text",
  color: "#ffffff",
  background: "#2563eb",
  opacity: 0.9,
}
```

`Color` accepts either a string or a two-string tuple. Use normal PDF/CSS-style color strings when a simple solid color is sufficient.

### Decorations

```ts
{
  text: "Decorated text",
  decoration: ["underline", "lineThrough"],
  decorationColor: "#dc2626",
  decorationStyle: "dashed",
  decorationThickness: 1.5,
}
```

Supported decorations:

- `underline`
- `lineThrough`
- `overline`

Supported non-default decoration styles:

- `dashed`
- `dotted`
- `double`
- `wavy`

### Text metrics and wrapping

```ts
{
  text: "Paragraph text",
  lineHeight: 1.4,
  paragraphGap: 8,
  characterSpacing: 0.3,
  leadingIndent: 18,
  noWrap: false,
  wordBreak: "break-all",
  preserveLeadingSpaces: true,
  preserveTrailingSpaces: true,
}
```

Available controls:

- `lineHeight`
- `paragraphGap`
- `characterSpacing`
- `leadingIndent`
- `noWrap`
- `wordBreak`: `normal` or `break-all`
- `preserveLeadingSpaces`
- `preserveTrailingSpaces`

---

## Spacing and positioning

### Margins

Margins support these forms:

```ts
margin: 12                    // all sides
margin: [12, 8]               // horizontal, vertical
margin: [10, 8, 10, 14]       // left, top, right, bottom
```

Individual sides are also supported:

```ts
{
  text: "Custom spacing",
  marginLeft: 10,
  marginTop: 8,
  marginRight: 10,
  marginBottom: 16,
}
```

### Absolute and relative positioning

```ts
{
  text: "Placed at a page coordinate",
  absolutePosition: { x: 60, y: 100 },
}

{
  text: "Shifted from its normal position",
  relativePosition: { x: 8, y: -4 },
}
```

Use absolute positioning sparingly because it is detached from normal document flow.

### Page breaks and unbreakable content

```ts
{ text: "New page", pageBreak: "before" }
{ text: "End this page", pageBreak: "after" }
```

Supported values:

- `before`
- `beforeOdd`
- `beforeEven`
- `after`
- `afterOdd`
- `afterEven`

Keep a node together when possible:

```ts
{
  stack: [/* ... */],
  unbreakable: true,
}
```

You can also provide a document-level `pageBreakBefore` callback for content-aware pagination.

### Oversized content on an empty page

When a text line or QR code is taller than the available page area, PDFCraft first tries normal pagination. If the destination page is empty, the engine permits that item to overflow rather than repeatedly creating new pages. This is an internal fallback, not a clipping or scaling option. Use `fit`, smaller font sizes, or explicit dimensions when the content must remain inside the page bounds.

---

## Pages and sections

### Page size

Use a named page size:

```ts
pageSize: "A4"
```

Or custom dimensions:

```ts
pageSize: { width: 720, height: 1080 }
```

Supported named families include:

- `4A0`, `2A0`, `A0`–`A10`
- `B0`–`B10`
- `C0`–`C10`
- `RA0`–`RA4`
- `SRA0`–`SRA4`
- `EXECUTIVE`, `FOLIO`, `LEGAL`, `LETTER`, `TABLOID`

### Orientation

```ts
pageOrientation: "portrait"
pageOrientation: "landscape"
```

A node can request a different orientation when it starts a page:

```ts
{
  text: "Landscape content",
  pageBreak: "before",
  pageOrientation: "landscape",
}
```

### Page margins

```ts
pageMargins: 40
pageMargins: [40, 56]
pageMargins: [40, 56, 40, 56]
```

Dynamic margins are supported:

```ts
pageMargins: (currentPage, pageCount, pageSize) =>
  currentPage === 1 ? [60, 80, 60, 60] : [40, 50]
```

### Sections

Sections can change page styling and repeated content:

```ts
{
  section: [
    { text: "Landscape section", fontSize: 20, bold: true },
    // ...
  ],
  pageSize: "A4",
  pageOrientation: "landscape",
  pageMargins: [36, 44],
  header: { text: "Section header", alignment: "right" },
  footer: { text: "Section footer", alignment: "center" },
  background: null,
  watermark: {
    text: "DRAFT",
    color: "#94a3b8",
    opacity: 0.15,
  },
}
```

Section properties may use `"inherit"` where supported to retain the previous page configuration.

---

## Stacks and decorated blocks

A stack lays out its children vertically.

```ts
{
  stack: [
    { text: "Card title", bold: true, fontSize: 13 },
    { text: "Card body", marginTop: 5 },
  ],
  backgroundColor: "#f8fafc",
  borderColor: "#cbd5e1",
  borderWidth: 1,
  borderRadius: 8,
  padding: [14, 12],
}
```

Stack decoration properties:

- `backgroundColor`
- `borderColor`
- `borderWidth`
- `borderRadius`
- `padding`

`padding` uses the same forms as margins.

---

## Columns

```ts
{
  columns: [
    { width: 120, text: "Fixed width" },
    { width: "auto", text: "Natural width" },
    { width: "*", text: "Remaining space" },
    { width: "25%", text: "Percentage" },
  ],
  columnGap: 12,
}
```

Supported widths:

- number: fixed width
- `auto`: natural width
- `*` or `star`: flexible remaining width
- percentage string such as `"30%"`

### Snaking columns

```ts
{
  columns: [
    { width: "*", stack: leftColumnContent },
    { width: "*", stack: rightColumnContent },
  ],
  columnGap: 20,
  snakingColumns: true,
}
```

With `snakingColumns`, overflowing content moves to the next column before creating a new page.

---

## Lists

### Unordered list

```ts
{
  ul: ["First", "Second", "Third"],
  type: "square",
  markerColor: "#2563eb",
}
```

### Ordered list

```ts
{
  ol: ["Install", "Configure", "Generate"],
  type: "upper-roman",
  start: 3,
  separator: ["(", ")"],
}
```

Supported list types:

- `disc`
- `circle`
- `square`
- `none`
- `decimal`
- `upper-alpha`
- `lower-alpha`
- `upper-roman`
- `lower-roman`

Other controls:

- `start`
- `counter`
- `reversed`
- `separator`
- `markerColor`

---

## Tables

Tables support widths, heights, headers, row groups, spanning, borders, fills, alignment, and fully custom layouts.

### Basic table

```ts
{
  table: {
    body: {
      groups: [
        {
          rows: [
            ["Name", "Status"],
            ["API", "Ready"],
          ],
        },
      ],
    },
    widths: ["*", "auto"],
  },
}
```

### Header and body layouts

```ts
{
  table: {
    header: {
      rows: [["Feature", "Value"]],
      layout: "headerLineOnly",
    },
    body: {
      groups: [
        {
          rows: [
            ["Font size", "12"],
            ["Color", "Blue"],
          ],
          keepTogether: true,
          dontBreakRows: true,
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 12,
            paddingRight: () => 12,
            paddingTop: rowIndex => rowIndex === 0 ? 8 : 2,
            paddingBottom: (rowIndex, _node, group) =>
              rowIndex === group.rowCount - 1 ? 8 : 2,
          },
        },
      ],
      layout: "lightHorizontalLines",
    },
    widths: ["*", 100],
    heights: "auto",
    borderRadius: 6,
  },
}
```

Built-in layouts visible in the source:

- `noBorders`
- `headerLineOnly`
- `lightHorizontalLines`

### Group layout overrides

Each body group may define a partial inline `layout`. It inherits omitted callbacks from
`body.layout` and may override only:

- `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`
- `hLineWidth`, `hLineColor`, `hLineStyle`
- `vLineWidth`, `vLineColor`, `vLineStyle`

Horizontal group callbacks receive a boundary index local to the group. Top and bottom padding
callbacks receive a local row index. Every callback also receives a group context containing
`groupIndex`, `rowCount`, `startRow`, and `endRow`. Vertical callbacks use the table column index;
their optional row index is local to the group.

Group line overrides apply only between the group's physical rows and columns. Structural edges
remain controlled by the body layout: the outer table border, boundaries between groups, the
header/body boundary, page-break closing borders, and rounded contours. Fill callbacks,
`defaultBorder`, and `hLineWhenBroken` therefore remain body-level controls.

### Cell styling

```ts
{
  text: "Styled cell",
  bold: true,
  color: "#ffffff",
  fillColor: "#2563eb",
  fillOpacity: 0.95,
  border: [true, false, true, true],
  borderColor: ["#1e3a8a", "#1e3a8a", "#1e3a8a", "#1e3a8a"],
  verticalAlignment: "middle",
  margin: [6, 4],
}
```

Cell controls:

- `colSpan`
- `rowSpan`
- `border`: left, top, right, bottom
- `borderColor`: left, top, right, bottom
- `fillColor`
- `fillOpacity`
- `verticalAlignment`: `top`, `middle`, `bottom`

### Column widths

```ts
widths: [80, "auto", "*", "25%"]
```

### Row heights

```ts
heights: 24
heights: [24, "auto", 32]
heights: rowIndex => rowIndex === 0 ? 30 : "auto"
```

### Custom table layout

Each callback receives the indexes and the resolved table node needed to make contextual decisions.

```ts
import type { TableLayout, TableLayoutNode } from "pdfcraft";

const zebraLayout: TableLayout = {
  hLineWidth: (index: number, node: TableLayoutNode): number =>
    index === 0 || index === node.table.body.length ? 0 : 0.5,

  vLineWidth: (index: number, node: TableLayoutNode): number =>
    index === 0 || index === node.table.widths.length ? 0 : 0.5,

  hLineColor: (
    index: number,
    node: TableLayoutNode,
    columnIndex?: number,
  ) => "#cbd5e1",

  vLineColor: (
    index: number,
    node: TableLayoutNode,
    rowIndex?: number,
  ) => "#cbd5e1",

  hLineStyle: (index: number, node: TableLayoutNode) => null,
  vLineStyle: (index: number, node: TableLayoutNode) => null,

  paddingLeft: (columnIndex: number, node: TableLayoutNode): number =>
    columnIndex === 0 ? 0 : 8,

  paddingRight: (columnIndex: number, node: TableLayoutNode): number =>
    columnIndex === node.table.widths.length - 1 ? 0 : 8,

  paddingTop: (rowIndex: number, node: TableLayoutNode): number => 6,
  paddingBottom: (rowIndex: number, node: TableLayoutNode): number => 6,

  fillColor: (
    rowIndex: number,
    node: TableLayoutNode,
    columnIndex: number,
  ) => rowIndex % 2 === 0 ? "#f8fafc" : null,

  fillOpacity: (
    rowIndex: number,
    node: TableLayoutNode,
    columnIndex: number,
  ): number => 1,

  hLineWhenBroken: true,
  defaultBorder: true,
};
```

Callback parameters:

| Callback | Parameters | Meaning |
|---|---|---|
| `hLineWidth` | `index`, `node` | `index` is the horizontal boundary, from `0` above the first row to `body.length` below the final row. |
| `vLineWidth` | `index`, `node` | `index` is the vertical boundary, from `0` before the first column to `widths.length` after the final column. |
| `hLineColor` | `index`, `node`, `columnIndex?` | The optional column index allows a horizontal border color to vary by segment. |
| `vLineColor` | `index`, `node`, `rowIndex?` | The optional row index allows a vertical border color to vary by segment. |
| `hLineStyle` | `index`, `node` | Returns a dash definition or `null` for a solid line. |
| `vLineStyle` | `index`, `node` | Returns a dash definition or `null` for a solid line. |
| `paddingLeft` | `columnIndex`, `node` | Left padding for cells in the selected column. |
| `paddingRight` | `columnIndex`, `node` | Right padding for cells in the selected column. |
| `paddingTop` | `rowIndex`, `node` | Top padding for cells in the selected row. |
| `paddingBottom` | `rowIndex`, `node` | Bottom padding for cells in the selected row. |
| `fillColor` | `rowIndex`, `node`, `columnIndex` | Background color for a specific cell. Return `null` or `undefined` for no fill. |
| `fillOpacity` | `rowIndex`, `node`, `columnIndex` | Background opacity for a specific cell. |

`node.table.body` contains the normalized rows, `node.table.widths` contains the resolved column definitions, and `node.table.headerRows` contains the number of header rows.

The built-in `noBorders` layout is equivalent to:

```ts
const noBorders: TableLayout = {
  hLineWidth(i: number, node: TableLayoutNode): number {
    return 0;
  },
  vLineWidth(i: number, node: TableLayoutNode): number {
    return 0;
  },
  paddingLeft(i: number, node: TableLayoutNode): number {
    return (i && 4) || 0;
  },
  paddingRight(i: number, node: TableLayoutNode): number {
    return i < node.table.widths.length - 1 ? 4 : 0;
  },
};
```

Usage example:

```ts
const doc = {
  content: [
    {
      table: {
        body: {
          groups: [{ rows: [["A", "B"], ["C", "D"]] }],
          layout: "zebra",
        },
        widths: ["*", "*"],
      },
    },
  ],
};

pdfcraft.createPdf(doc, {
  tableLayouts: { zebra: zebraLayout },
});
```

A layout can control:

- horizontal and vertical line width
- horizontal and vertical line color
- horizontal and vertical dash style
- cell padding on every side
- row/cell fill color and opacity
- behavior of horizontal lines across page breaks
- default border behavior

You can register layouts globally with `addTableLayouts()` or pass them to `createPdf()`.

---

## Images

```ts
{
  image: "logo",
  width: 160,
  opacity: 0.9,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#cbd5e1",
}
```

Image sizing controls:

- `width`
- `height`
- `fit: [maxWidth, maxHeight]`
- `cover: { width, height, align, valign }`
- `minWidth`, `maxWidth`
- `minHeight`, `maxHeight`

Image appearance controls:

- `opacity`
- `borderRadius`
- `borderWidth`
- `borderColor`
- normal node margins and positioning

### Fit

```ts
{
  image: "photo",
  fit: [300, 180],
}
```

### Cover and crop alignment

```ts
{
  image: "photo",
  cover: {
    width: 300,
    height: 180,
    align: "center",
    valign: "top",
  },
}
```

Horizontal cover alignment: `left`, `center`, `right`.

Vertical cover alignment: `top`, `center`, `bottom`.

### Image registry

```ts
const doc = {
  images: {
    logo: "data:image/png;base64,...",
    remotePhoto: {
      url: "https://example.com/photo.jpg",
      headers: { Authorization: "Bearer …" },
    },
  },
  content: [{ image: "logo", width: 120 }],
};
```

---

## SVG

```ts
{
  svg: `<svg viewBox="0 0 100 100">...</svg>`,
  width: 120,
  height: 120,
}
```

Supported sizing controls:

- `width`
- `height`
- `fit`
- `minWidth`, `maxWidth`
- `minHeight`, `maxHeight`
- `options`

SVG resources may also be registered in the document-level `svgs` dictionary.

---

## QR codes

```ts
{
  qr: "https://example.com",
  foreground: "#0f172a",
  background: "#ffffff",
  fit: 120,
  eccLevel: "H",
  mode: "octet",
  padding: 8,
}
```

QR codes participate in normal page flow. An oversized QR is moved to the next page when possible; on an otherwise empty page, it may overflow instead of triggering another page break. Set `fit` deliberately to keep it inside the printable area.

QR controls:

- `foreground`
- `background`
- `fit`
- `eccLevel`: `L`, `M`, `Q`, `H`
- `mode`: `numeric`, `alphanumeric`, `octet`
- `version`
- `mask`
- `padding`

---

## Canvas and vector graphics

Use `canvas` for low-level drawing.

```ts
{
  canvas: [
    {
      type: "rect",
      x: 0,
      y: 0,
      w: 200,
      h: 80,
      color: "#dbeafe",
      lineColor: "#2563eb",
      lineWidth: 1,
      r: 8,
    },
    {
      type: "line",
      x1: 12,
      y1: 40,
      x2: 188,
      y2: 40,
      lineColor: "#1d4ed8",
      lineWidth: 2,
      dash: { length: 6, space: 3 },
      lineCap: "round",
    },
  ],
}
```

Supported vector types:

- `line`
- `rect`
- `ellipse`
- `polyline`
- `path`

Common vector properties:

- coordinates: `x`, `y`, `x1`, `y1`, `x2`, `y2`
- size: `w`, `h`
- radii: `r`, `r1`, `r2`
- polyline `points`
- SVG-like path data `d`
- `lineWidth`
- `lineColor`
- fill `color`
- `fillOpacity`
- `lineOpacity`
- `strokeOpacity`
- `dash`
- `closePath`
- `linearGradient`
- `lineCap`: `butt`, `round`, `square`
- `lineJoin`: `miter`, `round`, `bevel`

### Gradient example

```ts
{
  canvas: [
    {
      type: "rect",
      x: 0,
      y: 0,
      w: 300,
      h: 90,
      linearGradient: ["#2563eb", "#7c3aed"],
    },
  ],
}
```

---

## Headers, footers, backgrounds, and watermarks

### Static header/footer

```ts
header: {
  text: "Company name",
  alignment: "right",
  margin: [0, 20, 40, 0],
}
```

### Dynamic header/footer

```ts
footer: (currentPage, pageCount, pageSize) => ({
  text: `${currentPage} / ${pageCount}`,
  alignment: "center",
  color: "#64748b",
  fontSize: 8,
})
```

### Dynamic background

```ts
background: (currentPage, pageCount, pageSize) => ({
  canvas: [
    {
      type: "rect",
      x: 0,
      y: 0,
      w: pageSize.width,
      h: 12,
      color: "#2563eb",
    },
  ],
})
```

### Watermark

```ts
watermark: {
  text: "CONFIDENTIAL",
  angle: -45,
  color: "#64748b",
  opacity: 0.12,
  bold: true,
  fontSize: 54,
}
```

A watermark may be a string or an object. Because the object extends `Style`, normal text style properties are available in addition to `text`, `angle`, `color`, `opacity`, `bold`, and `italics`.

---

## Links, references, TOC, and outlines

### External link

```ts
{
  text: "Open documentation",
  link: "https://example.com/docs",
  color: "#2563eb",
  decoration: "underline",
}
```

### Link to a page

```ts
{
  text: "Go to page 3",
  linkToPage: 3,
}
```

### Internal destination

```ts
[
  {
    text: "Jump to details",
    linkToDestination: "details",
    color: "#2563eb",
  },
  {
    text: "Details",
    id: "details",
    pageBreak: "before",
    fontSize: 20,
    bold: true,
  },
]
```

### Page and text references

```ts
{
  text: [
    "See page ",
    { pageReference: "details" },
  ],
}

{
  text: [
    "Section: ",
    { textReference: "details" },
  ],
}
```

### Table of contents

Mark content for a TOC:

```ts
{
  text: "Introduction",
  id: "intro",
  tocItem: "main",
  tocStyle: "tocText",
  tocNumberStyle: "tocNumber",
  headlineLevel: 1,
}
```

Render the TOC:

```ts
{
  toc: {
    id: "main",
    title: { text: "Contents", fontSize: 20, bold: true },
    textStyle: "tocText",
    numberStyle: "tocNumber",
    textMargin: [0, 2],
    sortBy: "title",
    sortLocale: "en",
    outlines: true,
    hideEmpty: true,
  },
}
```

### PDF outlines/bookmarks

```ts
{
  text: "Chapter 1",
  id: "chapter-1",
  outline: true,
  outlineExpanded: true,
  outlineText: "Chapter One",
  headlineLevel: 1,
}
```

Related controls:

- `outline`
- `outlineExpanded`
- `outlineParentId`
- `outlineText`
- `headlineLevel`

---

## Forms

PDFCraft exposes AcroForm nodes. Their appearance can be styled through field options.

```ts
{
  acroform: {
    type: "text",
    id: "full-name",
    options: {
      value: "",
      align: "left",
      multiline: false,
      required: true,
      backgroundColor: "#ffffff",
      borderColor: "#94a3b8",
      fontSize: 10,
    },
  },
  width: "*",
  height: 28,
}
```

Supported form types:

- `text`
- `button`
- `list`
- `combo`
- `checkbox`

Appearance-related options include:

- `align`
- `backgroundColor`
- `borderColor`
- `fontSize`
- `selected`
- `readOnly`
- `required`

---

## Fonts

Register custom font families with normal, bold, italic, and bold-italic sources.

```ts
const pdf = pdfcraft({
  fonts: {
    Inter: {
      normal: "Inter-Regular.ttf",
      bold: "Inter-Bold.ttf",
      italics: "Inter-Italic.ttf",
      bolditalics: "Inter-BoldItalic.ttf",
    },
  },
});
```

Then use the family by name:

```ts
{
  text: "Custom font",
  font: "Inter",
  bold: true,
}
```

Font sources may be local/VFS paths, URLs, resource references with headers, or source/subfont tuples where supported.

In browser builds, font containers can provide both VFS data and descriptors:

```ts
pdf.addFontContainer({
  vfs: {
    "Inter-Regular.ttf": "...base64...",
  },
  fonts: {
    Inter: {
      normal: "Inter-Regular.ttf",
    },
  },
});
```

---

## Style property reference

### Core typography

| Property | Type / values | Purpose |
|---|---|---|
| `font` | `string` | Font family |
| `fontSize` | `number` | Font size |
| `bold` | `boolean` | Bold face |
| `italics` | `boolean` | Italic face |
| `fontFeatures` | `string[]` | OpenType features |
| `color` | `Color` | Text color |
| `background` | `Color` | Inline text background |
| `opacity` | `number` | Opacity |
| `alignment` | `left \| center \| right \| justify` | Text alignment |
| `tableAlignment` | `left \| center \| right` | Table alignment |
| `sup` | `boolean` | Superscript |
| `sub` | `boolean` | Subscript |

### Decoration

| Property | Type / values |
|---|---|
| `decoration` | `underline`, `lineThrough`, `overline`, or array |
| `decorationColor` | `Color` |
| `decorationStyle` | `dashed`, `dotted`, `double`, `wavy` |
| `decorationThickness` | `number` |

### Text flow

| Property | Type / values |
|---|---|
| `lineHeight` | `number` |
| `paragraphGap` | `number` |
| `characterSpacing` | `number` |
| `leadingIndent` | `number` |
| `noWrap` | `boolean` |
| `wordBreak` | `normal \| break-all` |
| `preserveLeadingSpaces` | `boolean` |
| `preserveTrailingSpaces` | `boolean` |

### Spacing

| Property | Type / values |
|---|---|
| `margin` | number, 2-tuple, or 4-tuple |
| `marginLeft` | `number` |
| `marginTop` | `number` |
| `marginRight` | `number` |
| `marginBottom` | `number` |
| `columnGap` | `number` |

### Cell and block appearance

| Property | Type / values |
|---|---|
| `border` | `[left, top, right, bottom]` booleans |
| `borderColor` | four colors |
| `fillColor` | `Color` |
| `fillOpacity` | `number` |
| `backgroundColor` | `Color` |
| `borderWidth` | `number` |
| `borderRadius` | `number` |
| `padding` | margin syntax |
| `verticalAlignment` | `top \| middle \| bottom` |

### Flow and positioning

| Property | Type / values |
|---|---|
| `pageBreak` | before/after variants |
| `pageOrientation` | `portrait \| landscape` |
| `absolutePosition` | `{ x, y }` |
| `relativePosition` | `{ x, y }` |
| `unbreakable` | `boolean` |

### Navigation

| Property | Purpose |
|---|---|
| `id` | Internal destination identifier |
| `link` | External URL |
| `linkToPage` | Link to page number |
| `linkToDestination` | Link to node ID |
| `linkToFile` | Link to attachment/file |
| `pageReference` | Render destination page number |
| `textReference` | Render referenced text |
| `tocItem` | Add node to a TOC |
| `outline` | Add PDF bookmark/outline |

---

## Compatibility with the latest supplied source

The latest code update changes internal pagination behavior rather than the public styling API:

- text lines may overflow when the current page is empty and no valid page fit exists;
- QR codes use the same empty-page overflow fallback;
- QR insertion no longer depends on the page already containing another item;
- an internal table row result field was removed, with no change to `TableLayout`, table cells, row groups, or document styling syntax;
- an SVG path parser line was reformatted without changing its supported styling controls.

No migration is required for the style properties documented in this guide.

---

## Practical patterns

### Design tokens

Keep design values centralized:

```ts
const theme = {
  colors: {
    text: "#0f172a",
    muted: "#64748b",
    primary: "#2563eb",
    border: "#cbd5e1",
    panel: "#f8fafc",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 20,
    xl: 32,
  },
};

const styles = {
  body: {
    color: theme.colors.text,
    fontSize: 10,
    lineHeight: 1.3,
  },
  heading: {
    extends: "body",
    bold: true,
    fontSize: 16,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
};
```

### Card helper

```ts
import type { Content, StackNode } from "pdfcraft";

function card(content: Content[], title?: string): StackNode {
  return {
    stack: [
      ...(title ? [{ text: title, bold: true, marginBottom: 6 }] : []),
      ...content,
    ],
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    marginBottom: 12,
  };
}
```

### Alternating table rows

```ts
const stripedTable: TableLayout = {
  hLineWidth: (index, node) => 0,
  vLineWidth: (index, node) => 0,
  paddingLeft: (columnIndex, node) => 8,
  paddingRight: (columnIndex, node) => 8,
  paddingTop: (rowIndex, node) => 6,
  paddingBottom: (rowIndex, node) => 6,
  fillColor: (rowIndex, node, columnIndex) =>
    rowIndex % 2 ? "#ffffff" : "#f1f5f9",
  defaultBorder: false,
};
```

### Avoid fragile layout

Prefer normal flow, stacks, columns, tables, margins, and page-break controls. Reserve `absolutePosition` for overlays, fixed labels, or deliberately detached decoration.

### Accessibility and output quality

- Use sufficient color contrast.
- Do not communicate meaning with color alone.
- Set `language` on the document when appropriate.
- Use `tagged: true` when creating tagged PDFs is required.
- Use headings, outlines, and TOC metadata consistently.
- Register complete bold and italic font variants to avoid missing glyph/style issues.

---

## Minimal checklist

Before considering a PDF design complete, review:

- page size, orientation, and margins
- `defaultStyle` and named styles
- heading hierarchy and paragraph spacing
- text wrapping and long-token behavior
- table widths, row breaks, borders, and padding
- image fit/crop and opacity
- headers, footers, page numbering, and watermark
- section-level page changes
- links, bookmarks, and TOC
- custom fonts and glyph coverage
- contrast and accessibility
