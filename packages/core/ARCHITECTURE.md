# Feature ownership in `@pdfcraft/core`

This document assigns every behavior of the package to one owner, states which modules may depend on
which, and lists the known exceptions with the refactoring step that removes each of them.
`src/__tests__/architecture.test.ts` enforces the dependency rules and the lists of exceptions.

The generation pipeline, node lifecycle and test organization are described in
`docs/CORE-ARCHITECTURE.md` at the repository root. Paths below are relative to `packages/core/src/`.

## Goal

Each feature has one owner:

- a feature owns the behavior and appearance of its content across the whole node lifecycle;
- containers lay out their children through the common node dispatcher or through capabilities
  injected by composition, never by calling another feature's implementation;
- shared code handles only genuinely common operations.

Style inheritance is shared: the style stack resolves properties for every node. Each feature
interprets only the resolved properties that are relevant to it.

## Module categories

Every source file belongs to exactly one category. The category decides what it may import.

- **Node features**: `features/<kind>/` for `acroform`, `attachment`, `canvas`, `columns`,
  `extension`, `image`, `list`, `section`, `stack`, `table`, `text` and `toc`.
- **Document-level features**: `features/repeatables/` for headers and footers, backgrounds,
  watermarks and `pageBreakBefore`. They follow the same rules as node features.
- **Composition**: `composition/`. It is the only category that imports features, and it does so to
  connect them: registry, per-stage contexts, injected capabilities and rendering dispatch.
  Composition adds no feature behavior of its own.
- **Orchestration**: the entry points that run a generation and use composed facades:
  `index.ts`, `adapter.ts`, every file in `core/`, `layout/layout-builder.ts` and
  `rendering/renderer.ts`.
- **Shared services**: every other file, in `types/`, `utils/`, `services/`, `engine/`, `document/`,
  `layout/`, `rendering/`, `configuration/`, `resources/` and `output/`. They contain no knowledge of
  a concrete feature.

## Ownership map

### Text

Text owns text normalization (`text` values, tabs, nested text nodes), Unicode line breaking,
inline style flattening, inline measurement, line construction, paragraph flow, baseline alignment
and inline positioning, decorations (underline, overline, line-through and their styles),
backgrounds behind text, and text links (`link`, `linkToPage`, `linkToDestination`, outlines and
destinations). Page and text references (`pageReference`, `textReference`) are resolved and
measured by text.

Text positions inline elements. The payload of an inline element is measured and drawn by the
feature that owns it.

### Tables

Tables own the grouped public table API and its normalization, cells, row and column spans, row
groups (`keepTogether`, `dontBreakRows`, group layouts), repeated headers, table layouts and their
presets, borders including rounded borders, cell backgrounds and overlays, row heights, cell
vertical alignment, and table pagination with its break tracking.

### Columns

Columns own width distribution between columns, gaps, parallel placement of the columns of a row,
and flow between columns (`snakingColumns`).

### Stacks

Stacks own vertical sequencing of their items, paragraph spacing between items, and block
decoration: padding, background, border and rounded border.

### Lists

Lists own markers, numbering (counters, `start`, `reversed`, separators, alphabetic and roman
styles) and the indentation of items.

### Images

Images own image validation, inline data registration, sizing (`width`, `height`, `fit`, `cover`,
min and max sizes, `shrinkToFit`), placement as an atomic item and drawing, including image borders
and image links. When an image appears inside text, the image feature still measures and draws it.

### Forms, attachments and extensions

- AcroForm owns field validation, field measurement and field drawing, both as a block and inline.
- Attachments own attachment resources, measurement and the file annotation.
- The extension feature owns the extension lifecycle (`test`, `measure`, `render`, resource
  resolution and page-break keys). Each registered extension owns its own payload.

### Canvas

Canvas owns canvas-node measurement and the placement of its vectors. Shared vector rendering owns
the drawing primitives.

### Sections

Sections own page setup at a section boundary (size, orientation, margins) and the inheritance of
page settings, headers, footers, backgrounds and watermarks (`"inherit"`).

### Table of contents

The table of contents owns entry collection (`tocItem`), ordering (`sortBy`, `sortLocale`), the
references from entries to their targets, and its presentation choices (title, styles, margins,
outlines, `hideEmpty`). It presents entries as a table through table normalization supplied by
composition; it does not import the table feature.

### Document-level features

Headers, footers, backgrounds and watermarks remain document-level features. `pageBreakBefore` is
also a document-level feature: it builds the node information passed to the user callback.

### Shared services

- **Page coordinates and document context** (`document/`): pages, cursor, available space, margins,
  coordinate snapshots and their restoration.
- **Placement** (`layout/`, `engine/`): the element writer, page items, fragments, unbreakable
  transactions, repeatable fragments, page changes and generic pagination.
- **Resource loading** (`resources/`, `core/printer.resources.ts` for orchestration, the resource
  providers of `rendering/pdf-document.ts`): URL resolution, access policies, size and time limits,
  the virtual file system, fonts, images, patterns and attachments as PDF resources.
- **Style resolution** (`services/styles/`): style dictionaries, `extends`, overrides and
  inheritance.
- **Typography** (`services/typography/`): fonts and text metrics.
- **Lifecycle dispatch** (`engine/`, composition): stage contracts, the multi-pass pipeline and node
  lifecycle (margins, positioning, `pageBreak`, `unbreakable`, `absolutePosition`,
  `relativePosition`).
- **Rendering primitives** (`rendering/`): the PDFKit adapter, vectors, clipping and vertical
  alignment transforms.

An algorithm used by a single feature belongs to that feature, even if it is generic in shape.

## Dependency rules

Rules 1 to 4 cover runtime imports, type-only imports, re-exports, side-effect and dynamic imports,
type queries (`import("…")`), `require` calls and module augmentation (`declare module "…"`).

1. A node or document-level feature imports only its own feature and shared services. It never
   imports another feature (not even for a type), composition or orchestration.
2. A shared service imports only shared services. It never imports a feature, composition or
   orchestration.
3. Composition imports composition, features and shared services. It never imports orchestration.
4. Orchestration imports orchestration, composition and shared services. It never imports a feature
   directly.
5. A field of the shared node state (`PreprocessedNodeState`, `MeasuredNodeState`,
   `LayoutNodeState` in `types/document.types.ts`) is used as a property by more than one owner, or
   only by shared code. A field used by a single feature belongs to that feature's node types.

Every dependency that breaks rules 1 to 4 must appear in "Known import exceptions" below, and every
field that breaks rule 5 in "Known shared-state exceptions", with a matching allowlist entry in
`src/__tests__/architecture.test.ts`. The test fails on a new violation and on an allowlist entry
that no longer matches a violation. Exceptions name single files or fields; there are no
directory-wide exemptions.

The test parses every source with `oxc-parser` (a development dependency) and reads syntax nodes.
Comments, string literals, regular expressions and the literal text of template literals are never
taken for an import or a property use. Expressions inside `${…}` are code: an import or a property
access written there counts. A property use is a member access, an object or class key, a type
member, a string-literal index or an `in` test; variables, parameters and arguments with the same
name do not count.

## Known import exceptions

Each line names the importing file, the imported file, the reason and the step that removes it.

- `features/attachment/attachment-resources.ts` → `core/printer.types.ts`: attachment resource
  resolution reads `PrinterDocumentDefinition` and `PrinterResourceReference`, which are declared by
  orchestration. Removed in step 6.
- `features/attachment/attachment.feature.ts` → `core/printer.types.ts`: the attachment descriptor
  types its `resolveResources` hook with the same orchestration types. Removed in step 6.
- `services/resources/resource-reference.ts` → `core/printer.types.ts`: the shared resource guard
  narrows to `PrinterResourceReference`, declared by orchestration. Removed in step 6.
- `composition/built-in-printer-resources.ts` → `core/printer.types.ts`: composition types
  resource resolution with the orchestration document types. Removed in step 6.

Step 6 removes them by declaring the resource reference and the resolved document contract in
`types/`, where features, services, composition and orchestration can all use them.

## Known shared-state exceptions

Each line names the field of the shared node state, the only owner that uses it, the reason and the
step that removes it.

- `cell` (`features/table`): table row layout records the aligned cell on the vertical-alignment
  box (`LayoutNodeState`). Removed in step 2.
- `nodeHeight` (`features/table`): table row layout records the aligned content height on the
  vertical-alignment box (`LayoutNodeState`). Removed in step 2.
- `nodeInfo` (`features/repeatables`): `pageBreakBefore` stores the node information it builds for
  the user callback on the layout node (`LayoutNodeState`). Removed in step 6.

Step 2 splits vertical alignment (see "Step 2: columns and tables"): tables own cell alignment,
columns own the alignment of column children, and their alignment state moves into their own node
types.

## Known ownership exceptions

These couplings do not appear as forbidden imports, so the architecture test cannot detect them.
Each one names its owner and the step that removes it.

### Step 2: columns and tables

- **Columns use table row layout.** `composition/built-in-layout.ts` injects `TableRowLayout`
  (`features/table/layout-row.ts`) into columns as `processRow`, so column layout runs through
  table span, cell and break-tracking state. Owner: columns. Columns orchestrate their own row
  using the generic column-group operations of `DocumentContext`; `processRow` is no longer
  injected into columns.
- **Vertical alignment runs through table row layout.** Because columns share the row layout, a
  column child with `verticalAlignment` is aligned although the public column type does not
  declare it, and the alignment box state (`cell`, `nodeHeight`, `isCellContentMultiPage`,
  `getNodeHeight`, `getViewHeight` in `LayoutNodeState`) is filled by table code. Decision: step 2
  preserves column vertical alignment, including its current limitations. Tables own cell
  alignment, columns own the alignment of column children, and the alignment transforms
  (`rendering/render-vertical-alignment.ts`, the `beginVerticalAlignment` and `endVerticalAlignment`
  page items) stay shared and serve both.
- **Row-span state in the document context.** `ColumnEndingCell`, `markEnding`,
  `saveContextInEndingCell` and the `endingCell` parameters of `beginColumn`, `calculateBottomMost`
  and `completeColumnGroup` (`document/document-context*.ts`) carry row-span ending state. Owner:
  tables. Generic coordinate snapshots and their restoration stay shared.
- **Table break data in shared types.** `PageBreak.rowIndex`, `rowSpan` and `rowIndexOfSpanEnd`
  (`types/layout.types.ts`) belong to table break tracking. Owner: tables.
- **Table geometry in the width calculator.** `layout/column-calculator.ts` reads table paddings
  and borders from `metrics.layout` to resolve percentage widths. Owner: tables. The shared
  calculator receives numeric geometry; tables compute their reserved widths.
- **Column flow inspected by text and tables.** `features/text/layout-text.ts` and
  `features/table/layout-table.ts` call `inSnakingColumns()` and `isInNestedNonSnakingGroup()`, and
  `NodeLayoutContext.snakingAwarePageBreak` (`engine/contracts/node-feature.ts`) exposes snaking to
  every feature. The snaking policy is implemented in shared code (`document/document-context.snaking.ts`,
  the snaking branches of `layout/element-writer.page.ts`, `engine/layout-pagination.ts`). Owner:
  columns. Step 2 adds a minimal "advance to the next flow region" capability: columns decide
  their flow, and text and tables request advancement without inspecting snaking state. Text still
  rebuilds a line when the available width changes.

### Step 3: stacks

- **Decorated stacks become tables.** `features/stack/preprocess-decorated-stack.ts` rewrites a
  stack with `padding`, `borderRadius`, `borderWidth`, `borderColor` or `backgroundColor` into a
  single-cell table through the `preprocessTable` capability, and tables carry the `_blockContainer`
  option (`types/table.types.ts`, `features/table/preprocess-table.ts`) for it. Owner: stacks.
- **Table fill layering in fragment replay.** `layout/element-writer.fragments.ts` and
  `Vector._isFillColorFromUnbreakable` (`types/rendering.types.ts`) move table fills behind the
  content of a replayed unbreakable block. Owner: placement, through a generic layering contract
  that preserves drawing order.
- **Rounded geometry inside tables.** `createRoundedRectanglePath`
  (`features/table/table-processor.helpers.ts`) is needed by stacks. It becomes a shared vector
  primitive. The rounded-bottom vector registry stays in tables unless step 3 shows a genuinely
  common operation.

### Step 4: inline content

- **Text draws inline images.** `features/text/render-text.ts` calls `document.image` for inline
  images. Owner: images. Text keeps positioning; the image feature draws through an injected
  capability, as AcroForm already does.
- **Line ascent checks inline kinds.** `Line.getAscenderHeight` (`layout/line.ts`) tests
  `inline.image` and `inline.acroform`. Owner: text, using measured inline metrics.
- **Inline payload fields in the shared inline type.** `Inline.image`, `Inline.acroform`,
  `_imageWidth` and `_imageHeight` (`types/text.types.ts`). Owner: text, with the payload owned by
  the inline feature.

### Step 5: table normalization and internal tables

- **TOC builds a legacy table shape.** `features/toc/measure-toc.ts` creates an already
  preprocessed table with `dontBreakRows`, a flat `body` and a node-level `layout: "noBorders"`,
  bypassing table normalization. The node-level layout only works because
  `resolveTableLayout` (`features/table/measure-table.helpers.ts`) defaults its layout argument to
  `node.layout`. Owner: TOC for its presentation, tables for normalization.
- **Internal legacy table options.** `PdfTable.dontBreakRows`, `keepWithHeaderRows` and the
  `alreadyNormalized` path of `features/table/preprocess-table.ts` exist for internal tables only;
  the public API rejects them. Owner: tables.
- **Table data contracts in shared types.** `PdfTable`, `TableRowGroupRange`, `TableLayout` and
  `TableOffsets` (`types/table.types.ts`). Owner: tables. `ColumnWidth` and `RawColumnWidth` stay
  shared, since the width calculator uses them for columns too.
- **Table layout presets outside tables.** `configuration/table-layouts.ts` (presets and the
  default layout), `NodeMeasureContext.tableLayouts` (`engine/contracts/node-feature.ts`) and
  `LayoutBuilder.registerTableLayouts` route table presentation through shared code. Owner: tables.
  The public `tableLayouts` options of `PdfCraftBase` and `createPdf` are unchanged.

### Step 6: central feature knowledge

- **Hardcoded page-break properties.** `nodeInfoKeys` and `nodeInfo.stack`
  (`features/repeatables/page-break-before.feature.ts`) list the properties of several features,
  and the built `nodeInfo` is stored in the shared `LayoutNodeState`. Owner: each feature for its
  own properties, `pageBreakBefore` for `nodeInfo`.
- **Feature fields in shared node contracts.** `PdfNode`, `NodeHierarchy`, the internal
  `TocDefinition` (`types/document.types.ts`) and `_tocItemRef` on `Inline`
  (`types/text.types.ts`) carry fields of single features.
- **Feature kinds in shared page items.** `FeaturePageItem.type` lists the feature kinds
  (`types/rendering.types.ts`), and `ElementWriter.addFeatureItem` and
  `PageElementWriter.addFeatureItem` have a `"canvas"` overload.
- **Section knowledge in the style stack.** `StyleContextStack.autopush`
  (`services/styles/style-context-stack.ts`) skips nodes that have a `section` property. Owner:
  sections.
- **Section and stack kinds in composition.** `requiresFirstPage` (`composition/built-in-layout.ts`)
  tests `section` and `stack` kinds. Owner: sections.
- **Content kinds in cycle messages.** `contentKeys` (`composition/built-in-preprocessing.ts`)
  lists the public content keys. Owner: each feature.
- **Text identifiers in shared utilities.** `getNodeId` (`utils/node.ts`) searches nested text for
  an `id`. Owner: text.

## Planned simplifications

These are not ownership exceptions. Step 6 handles them after ownership is settled:

- consolidate the feature registries and lookups (`builtInFeatureRegistry`, the preprocessing
  registry and `getBuiltInFeatureByKind` in `composition/`);
- declare each feature's hook signatures once instead of in both its stage map and its feature type;
- factor the node fields repeated across preprocessed, measured and layout types;
- remove forwarding wrappers that provide no adaptation or useful boundary;
- remove the unused `GoTo` action reference created by `addPageLink()`
  (`rendering/renderer.helpers.ts`);
- remove output declarations in `types/output-document.types.ts` that duplicate the output
  document classes.

## Refactoring steps

1. Define and enforce ownership: this document and the architecture test. No production change.
2. Separate column layout from table row layout, move row-span state into tables, and introduce the
   flow-region capability.
3. Make stacks own their decoration, with a generic fill-layering contract and shared rounded
   geometry.
4. Finish ownership of inline content.
5. Give public and internal tables one normalization path, and move table presentation data into
   tables.
6. Reduce the framework around the features.

Each step removes its exceptions from this document and, for import exceptions, from the test
allowlist in the same change.
