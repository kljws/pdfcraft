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
  Composition adds no feature behavior of its own. Each feature declares the public keys of its
  content (`contentKeys`); composition chooses which features take part in a cross-feature output,
  such as the `pageBreakBefore` node information or cycle messages, and in which order.
  A feature that emits page items of its own kind adds `pageItem: true` to its `NodeKindRegistry`
  entry. Node properties follow the same rule: `PdfNode` (`types/document.types.ts`) declares the
  properties used by several owners, and each feature adds its content key to `NodeHierarchy` and
  its own options to `PdfNode` from its `*.types.ts`.
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

Text positions inline elements. Content of another feature inside a text fragment (an inline image
or form field) is described by that feature as an `InlineContentType` (`features/text/text.types.ts`):
how to recognize the fragment, whether its box sits against the line top or bottom, whether the
fragment's text style applies around it, whether it wraps, and how to measure it. Composition
supplies these types to text and dispatches drawing to the owner (`renderInlineContent`). Every
measured inline carries its `ascent`, which the line uses for baseline alignment.

### Tables

Tables own the grouped public table API and its normalization, cells, row and column spans, row
groups (`keepTogether`, `dontBreakRows`, group layouts), repeated headers, table layouts and their
presets, borders including rounded borders, cell backgrounds and overlays, row heights, cell
vertical alignment, and table pagination with its break tracking. Their data contracts
(`PdfTable`, `TableLayout`, row groups, offsets) live in `features/table/table.types.ts` and the
layout presets in `features/table/table-layouts.ts`. Every table, public or built by another
feature, goes through one normalization (`features/table/preprocess-table.ts`): `preprocessTable`
for definitions whose cells still need preprocessing, `normalizeTable` for cells that are already
preprocessed. `normalizeTable` also accepts table-level row keeping (`dontBreakRows`), which the
public shape does not expose; it keeps every row whole together with the first row's top border.
Layouts registered by the caller (`tableLayouts`) reach tables as a measurement capability supplied
by composition and replace presets of the same name.

### Columns

Columns own width distribution between columns, gaps, parallel placement of the columns of a row
(`features/columns/layout-columns.ts`), the vertical alignment of column children in the height of
their row, and flow between columns (`snakingColumns`): a snaking row opens a flow whose regions
are its columns (`features/columns/column-flow.ts`), deciding where the next column lies, whether
it fits on the page and where the first column starts on a new page.

### Stacks

Stacks own vertical sequencing of their items, paragraph spacing between items, and block
decoration: padding, background, border and rounded border (`features/stack/stack-decoration.ts`,
`features/stack/layout-decorated-stack.ts`). A decorated stack stays a stack node; across page
breaks it draws one framed fragment per page. Its decoration follows its own properties only:
table-cell properties inherited from enclosing nodes or styles (`fillColor`, `fillOpacity`,
`border`, `borderColor` tuples) do not apply to it, but remain inherited by its descendants.

### Lists

Lists own markers, numbering (counters, `start`, `reversed`, separators, alphabetic and roman
styles) and the indentation of items.

### Images

Images own image validation, inline data registration, sizing (`width`, `height`, `fit`, `cover`,
min and max sizes, `shrinkToFit`), placement as an atomic item and drawing, including image borders
and image links. When an image appears inside text, the image feature still measures and draws it
(`imageFeature.inline`): it is measured like a block image and drawn at its measured size, without
the block image's borders, cover, clipping or links.

### Forms, attachments and extensions

- AcroForm owns field validation, field measurement and field drawing, both as a block and inline
  (`acroFormFeature.inline`).
- Attachments own attachment resources, measurement and the file annotation.
- The extension feature owns the extension lifecycle (`test`, `measure`, `render`, resource
  resolution and page-break keys). Each registered extension owns its own payload.

### Canvas

Canvas owns canvas-node measurement and the placement of its vectors. Shared vector rendering owns
the drawing primitives.

### Sections

Sections own page setup at a section boundary (size, orientation, margins) and the inheritance of
page settings, headers, footers, backgrounds and watermarks (`"inherit"`). A container that frames
a leading section asks it to establish its page first (`preparePage`); a stack forwards that request
to its first item. A document whose layout starts with a section, directly or as the first item of
stacks, starts on the section's page instead of a default one (`establishesFirstPage`). Section
properties never apply as styles to its content (`sectionFeature.isUnstyled`, given to the style
stack by composition).

### Table of contents

The table of contents owns entry collection (`tocItem`), ordering (`sortBy`, `sortLocale`), the
references from entries to their targets (destinations found in nested text come from the text
feature's `getNodeId`, supplied by composition), and its presentation choices (title, styles, margins,
outlines, `hideEmpty`). It presents entries as a borderless table in the public grouped shape,
normalized with table-level row keeping through the `normalizeTable` capability supplied by
composition; it does not import the table feature.

### Document-level features

Headers, footers, backgrounds and watermarks remain document-level features. `pageBreakBefore` is
also a document-level feature: it builds the node information passed to the user callback from the
shared node properties and the content keys and feature checks that composition supplies, and keeps
it out of the shared node state.

### Shared services

- **Page coordinates and document context** (`document/`): pages, cursor, available space, margins,
  column groups, coordinate snapshots and their restoration (`captureCoordinates`,
  `restoreCoordinates`, and the `includeInGroupBottom` option of `beginColumn` and
  `completeColumnGroup`).
- **Flow regions** (`document/document-context.flow.ts`, `engine/layout-pagination.ts`): a column
  group may open a flow (`FlowRegions`) whose regions its container defines. Shared code keeps the
  region snapshots, enters the next region, restarts the flow on a new page and replays repeated
  fragments such as table headers in each region (`PageElementWriter.enterNextFlowRegion`). Content
  requests advancement with `advanceFlowRegion`, which tells whether it continues on the next page
  or in a new region; text rebuilds its line in a new region. Content inside a column group nested
  in the flow takes a plain page break unless it advances `throughNestedGroups`, as tables do
  between rows.
- **Width distribution** (`layout/column-calculator.ts`): fixed, percentage, auto and star widths
  from numeric geometry. A container passes the width it reserves inside each percentage column.
- **Placement** (`layout/`, `engine/`): the element writer, page items, fragments, unbreakable
  transactions, repeatable fragments, page changes and generic pagination. Vectors added with
  `addVectorBehindContent` (layer `behindContent`) are drawn after the page background items and
  before the content, also when an unbreakable block is replayed onto a page.
- **Vector geometry** (`layout/rounded-geometry.ts`): rounded rectangle and rounded corner paths,
  used by table and stack borders and backgrounds.
- **Resource loading** (`resources/`, `core/printer.resources.ts` for orchestration, the resource
  providers of `rendering/pdf-document.ts`): URL resolution, access policies, size and time limits,
  the virtual file system, fonts, images, patterns and attachments as PDF resources.
  The document definition that orchestration prepares and features resolve in place
  (`PrinterDocumentDefinition`) is declared in `types/printer-document.types.ts`.
- **Style resolution** (`services/styles/`): style dictionaries, `extends`, overrides and
  inheritance.
- **Typography** (`services/typography/`): fonts and text metrics.
- **Lifecycle dispatch** (`engine/`, composition): stage contracts, the multi-pass pipeline and node
  lifecycle (margins, positioning, `pageBreak`, `unbreakable`, `absolutePosition`,
  `relativePosition`). When a container allows it, the lifecycle brackets a vertically aligned node
  with alignment controls and returns them; the container completes them with the geometry of its
  box (`completeVerticalAlignment` in `engine/layout-node-lifecycle.ts`).
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

None. Each new exception names the importing file, the imported file, the reason and the step that
removes it: "- `source` → `target`: reason. Removed in step N."

## Known shared-state exceptions

None. Each new exception names the field of the shared node state, the only owner that uses it,
the reason and the step that removes it: "- `field` (`owner`): reason. Removed in step N."

## Known ownership exceptions

None. These couplings do not appear as forbidden imports, so the architecture test cannot detect
them; each new one names its owner and the step that removes it.

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
   Done.
2. Separate column layout from table row layout, move row-span state into tables, and introduce the
   flow-region capability. Done.
3. Make stacks own their decoration, with a generic fill-layering contract and shared rounded
   geometry. Done.
4. Finish ownership of inline content. Done.
5. Give public and internal tables one normalization path, and move table presentation data into
   tables. Done.
6. Reduce the framework around the features.

Each step removes its exceptions from this document and, for import exceptions, from the test
allowlist in the same change.
