# Architecture of `@pdfcraft/core`

This document describes how the package is organized and how a `DocumentDefinition` becomes a PDF.
It states where a behavior belongs and which dependencies are allowed. Dependency rules are
checked by `src/__tests__/architecture.test.ts`.

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
| `resources/`, `configuration/`, `output/` | URL resolution and virtual file system, page sizes and table layouts, output stream |
| `types/` | Public types (`types/index.ts`) and neutral internal types (`types/internal.ts`) |
| `utils/` | Utility functions with no feature knowledge |

## Behavior categories

### Node feature

It owns a content type across its whole lifecycle. Current node features are:
`section`, `columns`, `stack`, `list`, `table`, `text`, `toc`, `image`, `canvas`, `attachment`,
`acroform` and `extension` (which carries extensions registered by the user). Its code, its
node types, its private state and its tests stay in `src/features/<kind>/`.

### Document feature

It acts on a whole page or on the result of a pass, outside node dispatch:
background, header and footer, watermark and `pageBreakBefore`. It lives in
`features/repeatables/` and receives content only through ports (preprocess, measure, lay out
a block, know whether a node carries a list marker…).

### Shared service and engine

They provide neutral mechanisms: styles, typography, box measurement, writing page
elements, document context, pagination, primitive rendering and the PDFKit adapter. They
recognize no concrete node and contain no feature policy. An algorithm used
by a single feature stays in that feature.

## Feature descriptor

Each node feature exports a `<kind>Feature` descriptor that implements
`NodeFeature<Stages>` (`engine/contracts/node-feature.ts`). `Stages` describes the node type and
the context type at each stage. Only `matches` is required; the other hooks are provided only
when they are useful.

| Hook | Stage | Role |
|---|---|---|
| `matches` | before preprocessing | Recognizes the public shape without modifying it |
| `preprocess` | preprocessing | Validates, normalizes, assigns `_kind` and preprocesses children through a port |
| `resolveResources` | before measurement | Resolves document resources owned by the feature (attachments, extensions) |
| `measure` | measurement | Computes intrinsic sizes and metrics, without a position |
| `layout` | layout | Decides space use, breaks and page changes |
| `preparePage` | layout | Establishes the page the node starts on before a container frames it (sections) |
| `place` | layout | For an atomic element: tests the space, aligns and emits a `PageItem` |
| `render` | rendering | Translates the feature's `PageItem` into PDFKit calls |
| `decorate`, `reset` | layout | Prepare or reset layout state before a new attempt |
| `inline` | measurement | Measures the payload when the content appears in a text line |

Each hook receives the node type of its own `kind` and the context subset it declares.
The registry guarantees the node shape by dispatching on `_kind`.

## Feature registry

`composition/built-in-feature-registry.ts` holds the ordered `builtInFeatures` list and the
functions that dispatch each stage to the right hook.

- Each `kind` is registered once for every stage; a duplicate throws.
- Before preprocessing, a public node is recognized by the matchers. A node recognized by several
  features (for example `{ image, canvas }`) is rejected with `Ambiguous document node`.
- After preprocessing, dispatch uses `_kind` directly.
- The `extension` feature receives its matcher in composition, because it depends on the instance's
  extensions.
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
		};
	}
}
```

`types/` therefore imports no feature. Shared state (`PreprocessedNodeState`,
`MeasuredNodeState`, `LayoutNodeState`) contains only neutral concepts: references between
nodes, sizes, margins and positions. Feature-specific state lives in
its types, for example `TableNodeState` and `EndingCell` for table, `ListItemState` and `ListMarker`
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
type BuiltInMeasureContext = NodeMeasureContext & ListMeasureCapabilities & TextMeasureCapabilities;
```

Collaboration between features goes through a port declared by the consuming feature and injected by
composition:

| Consumer | Port | Provided by |
|---|---|---|
| `list` (measurement) | `ListMeasureCapabilities.inlines`: measure and build the marker inlines | text pipeline |
| `text` (measurement) | `TextMeasureCapabilities.inlines` | `TextInlines` composed with the inline content types `image.inline` and `acroform.inline` |
| `text` (rendering) | `renderInlineContent(inline, x, y)` | dispatch to `image.inline.render` or `acroform.inline.render` |
| `pageBreakBefore` | `hasLeadingMarker(node)`, `copyExtensionProperties` | `listFeature.hasMarker`, `extensionFeature` |
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
| Pass | `positions`, `_position`, `nodeInfo`, absolute x/y, `LayoutBuilder` state (`linearNodeList`, `nestedLevel`, writer) | `decorateNode`, `resetXY`, `startLayoutPass` |
| Pass, feature state | a feature's private state (tables, lists…) | the feature's `reset` hook, called by `resetXY` |
| Preprocessing | references, table of contents, current cycle | fresh state on every `preprocessDocument`/`preprocessBlock` |

## Inline content

`text` owns inline syntax, style inheritance, fragment flattening, Unicode
breaks, measurement, line construction and the line `PageItem`.

A feature usable inline (`image`, `acroform`) owns validation, measurement and rendering of its
payload, and exposes them through ports injected into the text pipeline. `text` does not import it.

## Page elements

`PageItem` is the boundary between layout and rendering.

- Shared primitives are `vector`, `line`, `beginClip`, `endClip`, `beginVerticalAlignment` and
  `endVerticalAlignment`. The renderer and page geometry handle them explicitly.
- An item emitted by a feature is a `FeaturePageItem` whose `type` is the feature's `kind`
  (`image`, `extension`, `attachment`, `acroform`). Geometry, fragment cloning and rendering
  treat it generically; rendering goes through `renderFeatureItem(kind, …)`.
- The element writer owns insertion, order, coordinates, cloning and shared checks. A feature never
  pushes directly into a page and never renders another feature's item.

## Allowed dependencies

Feature ownership, module categories, dependency rules and their known exceptions are defined in
the package ownership map, [`packages/core/ARCHITECTURE.md`](../packages/core/ARCHITECTURE.md).
`src/__tests__/architecture.test.ts` enforces them.

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
- Shapes are `type` aliases. These remain `interface`: declaration-merged registries
  (`NodeKindRegistry`, `PdfCraftContentExtensionRegistry`, `PdfCraftDocumentExtensionRegistry`),
  `PdfDocumentStream` (`this` type) and the types that break the recursive-node cycle
  (`PreprocessedNodeBase`, `MeasuredNodeBase`, `LayoutNodeBase`, `NodeHierarchy`,
  `TextReferenceState`, `TableNodeState`), each commented.
- Arrays in the public definition types are `readonly`.

## Adding a feature

1. Define its public shape in `types/content.types.ts`, its `kind` and its node types.
2. Create `src/features/<kind>/` with its descriptor and only the useful hooks.
3. Declare its node types on `NodeKindRegistry` from `<kind>.types.ts`.
4. Assign `_kind` during preprocessing with `markNodeKind`.
5. Express external needs through ports declared in the feature, without importing another
   feature, and provide them in composition.
6. Add a single entry to `builtInFeatures`.
7. If it emits its own page element, add its `kind` to `FeaturePageItem` and provide `place`
   and `render`.
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
