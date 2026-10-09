# Architecture of `@pdfcraft/core`

This document describes how the package is organized and how a `DocumentDefinition` becomes a PDF.
It assigns every behavior to one owner ("Ownership map"), states which modules may depend on which
("Dependency rules") and lists the known exceptions. `src/__tests__/architecture.test.ts` enforces
the dependency rules and checks that every allowed exception is listed here.

Unless noted otherwise, paths are relative to `packages/core/src/`.

## Overview

`@pdfcraft/core` receives a complete `DocumentDefinition` and produces a PDF with PDFKit.

```text
PdfCraftBase.createPdf(docDefinition)                core/pdfcraft.ts
  └─ clone of the DocumentDefinition                 utils/clone-document-definition.ts
     └─ Printer.createPdfKitDocument                 core/printer.ts
        ├─ URL and resource resolution               core/printer.resources.ts, resources/
        ├─ LayoutBuilder.layoutDocument              layout/layout-builder.ts
        │    └─ multi-pass layout pipeline           engine/document-layout-pipeline.ts
        │         └─ one pass                        composition/built-in-document-pipeline.ts
        │              1. preprocessing               composition/built-in-preprocessing.ts
        │              2. measurement                 composition/built-in-measurement.ts
        │              3. layout + pagination         composition/built-in-layout.ts
        │              4. document features           composition/built-in-document-features.ts
        │              → pages of PageItem
        └─ Renderer.renderPages                      rendering/renderer.ts
             └─ shared primitives + per-feature rendering   composition/built-in-rendering.ts
                → PDFKit document → OutputDocument     output/
```

The document is cloned once. The pipeline may then rerun several complete passes.
Each pass preprocesses the same tree again.

### Pass convergence

`engine/document-layout-pipeline.ts` reruns a pass while any of these reasons remains open:
footer heights, a `pageMargins` function or background that depends on the page count, and a
measured page number that differs from the final page of its target (`pageReference`, table of contents).

- These dynamic reasons must stabilize within 10 consecutive passes. Otherwise generation
  fails with `Layout did not converge…` and the list of reasons still open; an unstable
  result is never returned.
- Each break added by `pageBreakBefore` is permanent progress, because a node is evaluated
  only once. Breaks have their own bound (one per laid-out node) and reset the dynamic-reason
  budget.

Page numbers are measured with the page found by the previous pass: a node's `positions`
survive until its next layout. The first pass measures `00000`.

### Input validation

- Custom page sizes and margins are validated before pagination
  (`configuration/page-size.ts`); margins returned by a function are validated on every
  page. Messages include the input path.
- Preprocessing rejects a node that contains itself (the same node may still appear several
  times) and a `pageReference` with no target, after the whole tree has been preprocessed so
  forward references are allowed. A `textReference` with no target produces empty text and a warning.

### Resources and output

- `URLResolver` applies `resourceLoading.timeout` and `resourceLoading.maxSize` to every
  resource, and `signal` cancels downloads. The first failure cancels the others and is
  the one that is reported.
- `OutputDocument` defines who finalizes the stream: data methods (`getBuffer`, `write`…)
  finalize it themselves; a stream obtained with `getStream()` may be configured and then collected,
  or consumed and ended by the caller. Combinations that cannot produce a complete PDF
  are rejected explicitly. `getPageInfo()` reports whether `maxPagesNumber` truncated the
  document; page totals and references always describe the complete document.

### Entry points and platforms

| Entry | Role |
|---|---|
| `src/index.ts` (`@pdfcraft/core`) | Node.js entry: server output (`output/output-document.server.ts`), local access policy and missing-policy warnings |
| `src/adapter.ts` (`@pdfcraft/core/adapter`) | Runtime-neutral base for platforms: `PdfCraftBase`, `OutputDocument`, `OutputFactory` |
| `@pdfcraft/browser` | Separate package built on the adapter, with PDFKit standalone |

- A platform supplies its output through an `OutputFactory`, the required first argument of
  the `PdfCraftBase` constructor.
- Shared code does not detect the environment: the platform comes from the entry that is used.
- Everything the adapter reaches at runtime may import only `pdfkit` and `linebreak`,
  never a Node.js built-in or the server output
  (`src/__tests__/adapter-boundary.test.ts`). The browser package redirects `pdfkit` to the
  standalone build through a build alias; that choice is intentional.

## Folder layout

| Folder | Role |
|---|---|
| `core/` | Runtime entries: `PdfCraftBase`, `Printer`, metadata, embedded files, resource resolution |
| `composition/` | Assembles concrete features: registry, per-stage contexts, injected ports, single-pass pipeline, rendering |
| `features/<kind>/` | One node feature: descriptor, hooks, node types and tests |
| `features/repeatables/` | Document features: background, header and footer, watermark, `pageBreakBefore` |
| `engine/` | Neutral contracts (`contracts/node-feature.ts`), multi-pass pipeline, generic node lifecycle and pagination |
| `layout/` | Element writer, lines, columns, `PageItem` geometry and `LayoutBuilder` (entry point of layout orchestration) |
| `document/` | `DocumentContext`: pages, cursor, available space, column groups and flow regions |
| `rendering/` | PDFKit adapter, page renderer, shared primitives (vectors, clipping, vertical alignment) |
| `services/` | Neutral services: styles, typography, box measurement, resource references |
| `resources/`, `configuration/`, `output/` | URL resolution and virtual file system, page sizes, output stream |
| `types/` | Public types (`types/index.ts`) and neutral internal types (`types/internal.ts`) |
| `utils/` | Utility functions with no feature knowledge |

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

Shared code never lists features; each feature declares what concerns it:

- its node types and, with `pageItem: true`, the page items of its own kind, in its
  `NodeKindRegistry` entry;
- its content key in `NodeHierarchy` and its own node options in `PdfNode`, from the same
  `declare module` block of its `*.types.ts`; `PdfNode` (`types/document.types.ts`) declares only
  the properties used by several owners;
- the public keys of its content (`contentKeys`) on its descriptor. Composition chooses which
  features take part in a cross-feature output, such as the `pageBreakBefore` node information or
  cycle messages, and in which order.

## Ownership map

Each feature has one owner:

- a feature owns the behavior and appearance of its content across the whole node lifecycle;
- containers lay out their children through the common node dispatcher or through capabilities
  injected by composition, never by calling another feature's implementation;
- shared code handles only genuinely common operations.

Style inheritance is shared: the style stack resolves properties for every node. Each feature
interprets only the resolved properties that are relevant to it.

### Text

Text owns text normalization (`text` values, tabs, nested text nodes), Unicode line breaking,
inline style flattening, inline measurement, line construction, paragraph flow, baseline alignment
and inline positioning, decorations (underline, overline, line-through and their styles),
backgrounds behind text, and text links (`link`, `linkToPage`, `linkToDestination`, outlines and
destinations). Page and text references (`pageReference`, `textReference`) are resolved and
measured by text, as are the destination ids found in nested text (`getNodeId`) and the page number
that a text shows for another node, such as a table-of-contents number (`_tocItemRef`).

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

## Feature descriptor

Each node feature exports a `<kind>Feature` descriptor that implements
`NodeFeature<Stages>` (`engine/contracts/node-feature.ts`). `Stages` describes the node type and
the context type at each stage, and `NodeFeature` derives every hook signature from it; a feature
type adds only its literal `kind` and members that are not stage hooks. Only `matches` is
required; the other hooks are provided only when they are useful.

| Hook | Stage | Role |
|---|---|---|
| `matches` | before preprocessing | Recognizes the public shape without modifying it |
| `preprocess` | preprocessing | Validates, normalizes, assigns `_kind` and preprocesses children through a port |
| `resolveResources` | before measurement | Resolves document resources owned by the feature (attachments, extensions) |
| `measure` | measurement | Computes intrinsic sizes and metrics, without a position |
| `layout` | layout | Decides space use, breaks and page changes |
| `preparePage` | layout | Establishes the page the node starts on before a container frames it (sections; stacks forward to their first item) |
| `establishesFirstPage` | layout | Whether the node creates the first page of the document itself, so no default page is added (sections; stacks ask their first item) |
| `place` | layout | For an atomic element: tests the space, aligns and emits a `PageItem` |
| `render` | rendering | Translates the feature's `PageItem` into PDFKit calls |
| `decorate`, `reset` | layout | Prepare or reset layout state before a new attempt |
| `inline` | measurement | Measures the payload when the content appears in a text line |
| `contentKeys` | declaration | Public keys that identify the feature's content, used by composition for the `pageBreakBefore` node information and cycle messages |

Each hook receives the node type of its own `kind` and the context subset it declares.
The registry guarantees the node shape by dispatching on `_kind`.

## Feature registry

`composition/built-in-feature-registry.ts` holds the one ordered list of features
(`builtInFeatures`, then `extension`), its index by `kind`, and the functions that dispatch each
stage to the right hook.

- Each `kind` is registered once for every stage; a duplicate throws (`indexFeaturesByKind`).
- Before preprocessing, a public node is recognized by the matchers
  (`createFeatureDispatch(extensions)`). A node recognized by several features (for example
  `{ image, canvas }`) is rejected with `Ambiguous document node`.
- After preprocessing, dispatch uses `_kind` directly.
- The `extension` matcher is bound in `createFeatureDispatch`, because it depends on the
  instance's extensions.
- An unknown node produces `Unrecognized document structure`.
- The registry coordinates hooks but contains no feature algorithm. There is no
  per-stage list or `switch`.

## Node types

Nodes go through three typed stages: `PreprocessedPdfNode`, `MeasuredPdfNode` and
`LayoutPdfNode` (plus `MeasurePdfNode`, the shape received by `measure`).

These unions are built from the open `NodeKindRegistry` interface, declared in
`types/document.types.ts`. Each feature extends it from its own `<kind>.types.ts`:

```ts
declare module "../../types/document.types" {
	interface NodeKindRegistry {
		image: {
			preprocessed: PreprocessedImageNode;
			measure: MeasuredImageNode;
			measured: MeasuredImageNode;
			layout: LayoutImageNode;
			pageItem: true;
		};
	}
}
```

`types/` therefore imports no feature. Node properties follow the same rule (see "Module
categories").

Shared state (`PreprocessedNodeState`, `MeasuredNodeState`, `LayoutNodeState`) contains only
neutral concepts: references between nodes, sizes, margins and positions. Feature-specific state
lives in its types, for example `TableNodeState` and `EndingCell` for table, `ListItemState` and `ListMarker`
for list, `TextReferenceState` for text.

### In-place mutation

Stages enrich the same object instead of copying it. Page and text references, table-of-contents
items and repeated passes depend on object identity: a later pass finds nodes already preprocessed
and dispatches them by `_kind`.

- `markNodeKind(node, kind)` (`utils/node.ts`) is the only place that assigns `_kind` and returns
  the feature's preprocessed type.
- `PendingMeasureNode` types a child sent to measurement by its parent: it is still preprocessed even
  when the parent's measured shape already types it as measured.

## Composition and ports

Composition is the only place that imports concrete features. For each stage, it
builds a context that is the intersection of the needs declared by the features:

```ts
type BuiltInMeasureContext = NodeMeasureContext &
	ListMeasureCapabilities &
	TableMeasureCapabilities &
	TextMeasureCapabilities &
	TocMeasureCapabilities;
```

Collaboration between features goes through a port declared by the consuming feature and injected by
composition:

| Consumer | Port | Provided by |
|---|---|---|
| `list` (measurement) | `ListMeasureCapabilities.inlines`: measure and build the marker inlines | text pipeline |
| `table` (measurement) | `TableMeasureCapabilities.tableLayouts` | layouts registered by the caller |
| `toc` (measurement) | `TocMeasureCapabilities.normalizeTable`, `getNodeId` | `tableFeature.normalize`, the text feature's `getNodeId` |
| `text` (measurement) | `TextMeasureCapabilities.inlines` | `TextInlines` composed with the inline content types `image.inline` and `acroform.inline` |
| `text` (rendering) | `renderInlineContent(inline, x, y)` | dispatch to `image.inline.render` or `acroform.inline.render` |
| `pageBreakBefore` | `contentKeys`, `isBlank(node)`, `isStack(node)`, `copyExtensionProperties` | the `contentKeys` of text, list, table, image, canvas and columns; text kind with `listFeature.hasMarker`; stack kind; `extensionFeature` |
| style stack (measurement) | `StyleContextOptions.isUnstyled(node)` | `sectionFeature.isUnstyled` |
| background, header and footer | `preprocessNode`, `measureNode`, `layoutNode` | single-pass pipeline |
| page element writer | `ElementPlacementAdapter` | `createBuiltInElementPlacement` |

`createBuiltInPreprocessing(extensions)` creates a fresh reference and table-of-contents state on
every `preprocessDocument` or `preprocessBlock` call. `createBuiltInMeasurement(options)` creates
the style stack and the inline text engine; `textInlines` can be replaced through an option.

## Pagination and unbreakable content

The engine owns the generic mechanisms: available space, margins, current context, page or
flow-region changes, `pageBreak`, `unbreakable`, transactions, cancelling an attempt and resuming
on the next page.

Each feature owns the decisions specific to its structure:

- `table` decides where to split a table, group or row: `dontBreakRows`, `keepTogether`, repeated
  headers, fixed heights, `rowSpan`, `colSpan`, borders and fragments;
- `text` decides line and paragraph breaks;
- `list` keeps the marker with the first content of the item;
- `columns` synchronizes its columns and their page changes, and defines the regions of its
  snaking flow;
- `image` and the other atomic elements move to the next page when they do not fit.

The engine does not know a table's rows or cells, and `table` does not reimplement the
generic page change. Ghost cells created by a span have no `_kind` and are
ignored by dispatch.

`DocumentContext.getCurrentPage()` returns `undefined` before the first page; code that places
content uses `requireCurrentPage()`, which throws an explicit error if no page exists.

### Oversized content

- An atomic element (`image`, `canvas`, `attachment`, `acroform`, extension) is placed through
  `findPlacementPage`. If it does not fit, the writer moves to the next column or page; on a
  page that contains only the background, or on the last forced attempt, it is accepted and
  overflows. It is never dropped.
- An image that overflows the area where it is placed produces a single warning. With
  `shrinkToFit`, it is scaled down proportionally to that area.
- An `unbreakable` block, a `dontBreakRows` or `keepTogether` group, and a table header larger
  than a page are split like ordinary content, with nothing dropped. A header or footer
  that leaves no space is rejected.

### State lifetime

| Lifetime | State | Reset by |
|---|---|---|
| Document | `pageBreakCalculated`, `pageBreak` added by `pageBreakBefore`, `_x` (original relative x) | never |
| Pass | `positions`, `_position`, absolute x/y, `LayoutBuilder` state (`linearNodeList`, `nestedLevel`, writer) | `decorateNode`, `resetXY`, `startLayoutPass` |
| Pass, feature state | a feature's private state (tables, lists…) | the feature's `reset` hook, called by `resetXY` |
| Preprocessing | references, table of contents, current cycle | fresh state on every `preprocessDocument`/`preprocessBlock` |

## Page elements

`PageItem` is the boundary between layout and rendering.

- Shared primitives are `vector`, `line`, `beginClip`, `endClip`, `beginVerticalAlignment` and
  `endVerticalAlignment`. The renderer and page geometry handle them explicitly.
- An item emitted by a feature is a `FeaturePageItem` whose `type` is the feature's `kind`
  (`image`, `extension`, `attachment`, `acroform`), registered with `pageItem: true` in the
  feature's `NodeKindRegistry` entry. Geometry, fragment cloning and rendering
  treat it generically; rendering goes through `renderFeatureItem(kind, …)`.
- The element writer owns insertion, order, coordinates, cloning and shared checks. A feature never
  pushes directly into a page and never renders another feature's item.

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

## Intended repetition

- Each feature declares one node type per stage. Only `_kind` and the content key repeat between
  them, typed with each stage's node shape; most stages add fields of their own. The shared node
  bases are composed from the state types and repeat nothing.
- `types/output-document.types.ts` declares the public structural output types (no private
  members, no DOM library dependency). The output classes implement them (`implements`): a class
  that no longer satisfies its public type is a compile error, while methods beyond it remain
  allowed.

## Tests

- **Per feature:** `features/<kind>/__tests__/` covers the implemented stages and invalid
  shapes.
- **Architecture:** `src/__tests__/architecture.test.ts` checks imports and ownership of
  shared state.
- **Table pagination:** `features/table/__tests__/table.pagination.snapshot.test.ts` lays out
  a corpus of tables and compares every page element to a snapshot. Any change to table
  pagination shows up as a snapshot difference.
- **Organization:** unit tests (`*.test.ts`) and integration tests (`*.integ.ts`) live
  in a `__tests__/` folder next to the code under test; cross-cutting tests and shared helpers
  live in `src/__tests__/`. `packages/core/tests/types/` contains only type-contract tests,
  compiled by `tsc` against the built package.
- **Reference documents:** `src/__tests__/fixtures/reference-documents.ts` describes documents
  covering text, images, tables, columns, lists, headers, footers, references and the table
  of contents. `src/__tests__/reference-documents.integ.ts` generates them through the public API, reads the PDF with
  pdf.js, checks the expected text and compares the final page elements to a snapshot. A
  simplification must not change any snapshot.
- **Fixtures:** `src/__tests__/fixtures/` provides `createTestMeasurement` and the typed assertions
  `expectPreprocessedKind` and `expectMeasuredKind`, `layout-builder.ts` a test `LayoutBuilder`,
  `integration.helpers.ts` integration page rendering, and `reference-render.ts` rendering and
  pdf.js reading of the reference documents.
- **Vitest projects:** the root configuration (`vitest.config.mts`) defines the `unit`
  (`*.test.ts`), `integration` (`*.integ.ts`) and `consumer` (`tests/consumer/`, after the build)
  projects. Browser tests use `vitest-browser.config.mts`.
- **Typing:** `pnpm typecheck` at the repository root also checks test types.

Tests are run from the repository root, because font paths are relative to the root.

## TypeScript conventions

- `packages/core/tsconfig.build.json` enables `exactOptionalPropertyTypes` and
  `noUncheckedIndexedAccess` for source code (not for tests). An optional property
  that may be `undefined` declares it (`foo?: string | undefined`); an indexed read is
  narrowed before use (`for…of`, a guard, an explicit invariant).
- Options passed to PDFKit go through `withoutUndefined` (`utils/defined.ts`), because PDFKit
  types reject `undefined`.
- Shapes are `type` aliases. These remain `interface`: declaration-merged types
  (`NodeKindRegistry`, `PdfNode`, `NodeHierarchy`, `PdfCraftContentExtensionRegistry`,
  `PdfCraftDocumentExtensionRegistry`),
  `PdfDocumentStream` (`this` type) and the types that break the recursive-node cycle
  (`PreprocessedNodeBase`, `MeasuredNodeBase`, `LayoutNodeBase`, `TextReferenceState`,
  `TableNodeState`), each commented.
- Arrays in the public definition types are `readonly`.

## Adding a feature

1. Define its public shape in `types/content.types.ts`, its `kind` and its node types.
2. Create `src/features/<kind>/` with its descriptor and only the useful hooks.
3. Declare its node types on `NodeKindRegistry` from `<kind>.types.ts`, its content key on
   `NodeHierarchy` and its own node options on `PdfNode` from the same file, and its public content
   keys as `contentKeys` on the descriptor.
4. Assign `_kind` during preprocessing with `markNodeKind`.
5. Express external needs through ports declared in the feature, without importing another
   feature, and provide them in composition.
6. Add a single entry to `builtInFeatures`.
7. If it emits its own page element, set `pageItem: true` in its `NodeKindRegistry` entry and
   provide `place` and `render`.
8. Test the implemented stages, invalid shapes and the pagination rules involved, then
   update the changelog if public behavior changes.

A feature is isolated if removing it from the registry removes its behavior without leaving
feature-specific knowledge in the engine.

## Examples

- **New `text` field:** change its public type, `features/text/` and its tests, without adding a
  branch to the generic services.
- **Table break:** fix `features/table/` and check the pagination snapshots.
- **Atomic feature:** provide matching, preprocessing, measurement, placement and rendering, then add
  it once to the registry.

## Out of scope

- Changing the public format without an explicit need, or changing the rendering of existing PDFs.
- Replacing PDFKit.
- Copying nodes at every stage instead of enriching them in place.
- Turning every function into a service or interface, or artificially splitting every stage into
  a different file.
