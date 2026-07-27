# PDFCraft architecture

This document is the architectural map of PDFCraft. It is intended to give a maintainer or an AI enough context to:

- locate the code path responsible for a reported behavior;
- distinguish a bug from a new feature or an architectural change;
- estimate whether a pdfmake issue is applicable to PDFCraft;
- identify the public contracts, implementation files and tests that must change together;
- avoid reintroducing behavior already fixed and documented in `CHANGELOG.md`.

Its file-by-file scope is deliberately limited to `src/` and `tests/`. Other repository files and directories are not catalogued here.

## Product boundaries

PDFCraft is a TypeScript document-definition-to-PDF engine based historically on pdfmake 0.3.11. It now has its own public API, validation, resource policies, Node.js/browser outputs, layout extensions and tests.

Supported runtime targets:

- Node.js 22 and newer through `pdfcraft`;
- modern browsers through the ESM-only `pdfcraft/browser` export;
- PDF generation from structured document definitions, not HTML, Markdown or existing PDF templates.

Important non-goals unless a new public feature is explicitly approved:

- HTML/CSS layout;
- editing an existing PDF;
- direct unrestricted access to PDFKit internals;
- a charting engine;
- React Native support;
- implicit RTL support;
- destructive clipping of arbitrary overflowing content.

## End-to-end generation flow

```text
DocumentDefinition
  │
  ├─ PdfCraftBase.createPdf()
  │    clone definition, merge options, create URL resolver
  │
  ├─ PdfPrinter.createPdfKitDocument()
  │    resolve resources, normalize document options, create PDFKit document
  │
  ├─ DocPreprocessor
  │    normalize shorthand nodes and validate document structure
  │
  ├─ DocMeasure + TextInlines + SVGMeasure + ColumnCalculator
  │    resolve styles, fonts, intrinsic sizes and table column constraints
  │
  ├─ LayoutBuilder + DocumentContext + ElementWriter + TableProcessor
  │    paginate measured nodes and produce positioned PdfPage items
  │
  ├─ Renderer + RendererGraphics + PDFDocument
  │    translate page items into PDFKit operations
  │
  └─ OutputDocument
       expose stream/buffer/data URL/blob/download/write operations by runtime
```

The current engine performs layout before rendering. All positioned pages are therefore available in memory before `Renderer.renderPages()` starts. This is the main architectural constraint for true incremental generation.

## Architectural invariants

1. Public document definitions are cloned before internal mutation. Repeated references remain independent occurrences while cycles are preserved safely.
2. Preprocessing owns structural normalization and structural errors. Layout code should not silently repair malformed public input.
3. Measurement computes intrinsic dimensions and enriches nodes. It does not own final page coordinates.
4. Layout owns pagination, page margins, columns, repeatables, table splitting and final coordinates.
5. Rendering consumes positioned page items. It should not make new layout decisions.
6. Node-only APIs must not leak into the browser bundle. Browser UI methods must stay outside the layout/rendering core.
7. External URL and local-file access must pass their configured policies.
8. Public type changes require Node and browser type-contract tests.
9. Unit tests stay under the nearest `src/**/__tests__/` directory. Cross-module, output and browser behavior belongs under `tests/`.
10. Every release-relevant change must be recorded in `CHANGELOG.md` with the upstream issue or PR link when applicable.

## Dependency direction

The preferred dependency direction is:

```text
types / utils / vendor
        ↓
resources / text / configuration
        ↓
preprocessing / measurement / document
        ↓
layout
        ↓
rendering
        ↓
core
        ↓
Node and browser entries / output adapters
```

Circular ownership between layout, measurement and rendering is a warning sign. Type-only imports are acceptable where internal positioned-node contracts must be shared.

## Public entry points

### `pdfcraft`

The Node.js entry is `src/index.ts`. It creates `OutputDocumentServer`, exposes filesystem writing and accepts local font/file paths subject to `LocalAccessPolicy`.

### `pdfcraft/browser`

The browser entry is `src/browser/index.ts`. It bundles the PDFKit standalone build and exposes blobs, downloads, opening and printing. The layout engine itself does not require the DOM; only browser output convenience methods do.

### `pdfcraft/types`

The type-only entry is `src/types/index.ts`. It must remain runtime-neutral and must not import executable Node or browser code.

## `src/`: production source

### Entry points

| File | Responsibility |
| --- | --- |
| `src/index.ts` | Node entry. Specializes `PdfCraftBase` with `OutputDocumentServer` and exports the default instance plus factory/class access. |
| `src/browser/index.ts` | Browser entry. Adds VFS/font-container helpers and specializes output as `OutputDocumentBrowser`. |

### `src/core/`: orchestration

| File | Responsibility |
| --- | --- |
| `src/core/pdfcraft.ts` | Public instance state and `createPdf()` lifecycle: validates arguments, merges instance/document options, clones definitions, configures resource policies and creates a printer. Start here for API lifecycle, instance isolation and option precedence. |
| `src/core/printer.ts` | Central generation coordinator: resolves resources, normalizes document/PDFKit options, creates `PDFDocument`, invokes layout, limits pages and invokes the renderer. Start here for whole-document behavior and memory/streaming questions. |
| `src/core/printer.helpers.ts` | Pure helpers for resolved images/SVGs/attachments, metadata, embedded files and infinite-page height calculation. |
| `src/core/printer.resources.ts` | Walks font/image/SVG/attachment resources, converts URL references into VFS keys and waits for URL resolution. |
| `src/core/printer.types.ts` | Internal printer definition, resource and PDFKit option contracts. These are not the public document-definition types. |

Tests:

| File | Focus |
| --- | --- |
| `src/core/__tests__/pdfcraft.test.ts` | Instance isolation, cloning, option precedence, policies and public creation behavior. |
| `src/core/__tests__/printer.test.ts` | Printer orchestration, options and document creation. |
| `src/core/__tests__/printer.helpers.test.ts` | Metadata/resources/helper calculations. |
| `src/core/__tests__/printer.resources.test.ts` | URL, binary and attachment resolution routing. |

### `src/configuration/`: page and built-in layout configuration

| File | Responsibility |
| --- | --- |
| `src/configuration/page-size.constants.ts` | Canonical named PDF page dimensions. |
| `src/configuration/page-size.ts` | Resolves named/custom page sizes, orientation and static/dynamic margins. |
| `src/configuration/table-layouts.ts` | Built-in table layouts and the default resolved layout callbacks. |
| `src/configuration/__tests__/table-layouts.test.ts` | Built-in layout callback and default-border behavior. |

### `src/resources/`: external and virtual resources

| File | Responsibility |
| --- | --- |
| `src/resources/virtual-file-system.ts` | Runtime-neutral in-memory byte store used for fonts, images, SVGs and attachments. |
| `src/resources/url-resolver.ts` | Fetches HTTP(S) resources once, enforces URL policy before/after redirects and stores results in the VFS. |
| `src/resources/__tests__/virtual-file-system.test.ts` | VFS encoding, byte-copy and path-normalization behavior. |
| `src/resources/__tests__/url-resolver.test.ts` | Fetch caching, redirects, failures and access-policy enforcement. |

### `src/preprocessing/`: structural normalization

| File | Responsibility |
| --- | --- |
| `src/preprocessing/doc-preprocessor.ts` | Converts shorthand values into nodes, normalizes text/lists/tables/TOCs/sections, validates structures and expands compact span placeholders. Route malformed-definition issues here first. |
| `src/preprocessing/__tests__/doc-preprocessor.test.ts` | Supported shorthand, invalid structures, section constraints, spans and preprocessing errors. |

### `src/measurement/`: intrinsic sizing

| File | Responsibility |
| --- | --- |
| `src/measurement/doc-measure.ts` | Main measurement dispatcher and style-stack owner. Produces measured nodes for every content type. |
| `src/measurement/doc-measure.containers.ts` | Measures stacks, columns, lists, TOCs and other container structures. |
| `src/measurement/doc-measure.media.ts` | Measures images, SVGs, QR codes, canvas vectors, attachments and AcroForms. |
| `src/measurement/doc-measure.table.ts` | Resolves table layouts, offsets, min/max widths and `colSpan`/`rowSpan` measurement effects. Route column-width and span-sizing issues here. |
| `src/measurement/list-markers.ts` | Builds unordered markers and formats ordered alphabetic/Roman counters. |
| `src/measurement/svg-measure.ts` | Parses SVG dimensions/viewBox and computes intrinsic/scaled sizes. |
| `src/measurement/__tests__/doc-measure.test.ts` | General node, style, media, list, column and table measurement behavior. |
| `src/measurement/__tests__/svg-measure.test.ts` | SVG dimension/viewBox and invalid-SVG measurement cases. |

### `src/text/`: line breaking and inline shaping

| File | Responsibility |
| --- | --- |
| `src/text/text-breaker.ts` | Uses Unicode line breaking, whitespace rules and explicit break-all behavior to split text into words/fragments. |
| `src/text/text-inlines.ts` | Flattens nested text, resolves fonts/styles, measures inlines, hard-wraps long tokens and builds line-ready inline data. |
| `src/text/text-decorator.ts` | Groups and renders text backgrounds, underline, overline and line-through geometry. |
| `src/text/text.types.ts` | Private contracts shared by breaker, inline measurement and decoration. |
| `src/text/__tests__/text-breaker.test.ts` | Unicode breaks, whitespace and word-boundary behavior. |
| `src/text/__tests__/text-inlines.test.ts` | Inline flattening, font/style resolution, hard wrapping, images and measurements. |
| `src/text/__tests__/text-decorator.test.ts` | Decoration grouping and vector geometry. |

### `src/document/`: mutable pagination state

| File | Responsibility |
| --- | --- |
| `src/document/document-context.ts` | Owns pages, current coordinates, available space, margins, columns, transactions and page creation state. It is the central mutable state used by writers. |
| `src/document/document-context.geometry.ts` | Page size/orientation resolution and bottom-most coordinate helpers. |
| `src/document/document-context.helpers.ts` | Page creation/position helpers and nested-snaking detection. |
| `src/document/document-context.columns.ts` | Standard column-group lifecycle, ending cells and bottom reconciliation. |
| `src/document/document-context.snaking.ts` | Snaking-column snapshots, transitions and page resets. |
| `src/document/document-context.types.ts` | Context snapshots, page positions, column-ending and event contracts. |
| `src/document/__tests__/document-context.test.ts` | Geometry, pages, standard/snaking columns, snapshots and transitions. |

### `src/layout/`: pagination and positioned page items

#### Main builder

| File | Responsibility |
| --- | --- |
| `src/layout/layout-builder.ts` | Runs preprocessing/measurement/layout passes, owns the writer, dispatches node processing and returns all `PdfPage` objects. Handles bounded relayout for page-count-dependent margins/backgrounds and `pageBreakBefore`. |
| `src/layout/layout-builder.content.ts` | Processes measured node kinds, node positions, TOCs and page references. |
| `src/layout/layout-builder.rows.ts` | Lays out table-row cells, reconciles cell heights/page breaks and vertical alignment. |
| `src/layout/layout-builder.table-processing.ts` | Coordinates `TableProcessor` per table row, including fixed-height pre-breaks and table-level lifecycle. |
| `src/layout/layout-builder.table.ts` | Table page-break metadata and row-span break reconciliation utilities. |
| `src/layout/layout-builder.repeatables.ts` | Backgrounds, headers, footers and their page-count-aware dynamic callbacks. |
| `src/layout/layout-builder.page-breaks.ts` | Builds `pageBreakBefore` node metadata, evaluates callbacks and resets positions for relayout. |
| `src/layout/layout-builder.sections.ts` | Resolves section-level page size/orientation/margins/header/footer/background inheritance. |
| `src/layout/layout-builder.watermark.ts` | Measures and creates text/image watermark render data. |
| `src/layout/layout-builder.helpers.ts` | Shared inline cloning, page-span height and maximum-fit helpers. |
| `src/layout/layout-builder.types.ts` | Layout-pass, page-break and repeatable callback contracts. |

#### Writers and lines

| File | Responsibility |
| --- | --- |
| `src/layout/element-writer.ts` | Base positioned-item writer, events, transactions/fragments, node page-number updates and internal vector-insertion tracking that survives fragment cloning. |
| `src/layout/element-writer.page.ts` | Page-aware writer: automatic page changes, repeatable blocks, unbreakable transactions and column transitions. |
| `src/layout/element-writer.media.ts` | Places images, SVGs, canvases, QR codes and attachments with overflow/page-fit rules. |
| `src/layout/element-writer.form.ts` | Places block and inline AcroForm controls. |
| `src/layout/element-writer.helpers.ts` | Alignment, fragment height and page-item insertion helpers. |
| `src/layout/line.ts` | Mutable laid-out text line: inline insertion, width, ascender/height and alignment. |
| `src/layout/page-item-geometry.ts` | Computes vector/page-item lower bounds for layout calculations. |
| `src/layout/node.decorators.ts` | Adds layout lifecycle callbacks/metadata to nodes without inheritance. |
| `src/layout/style-context-stack.ts` | Resolves inherited/default/named/local style properties with explicit stack ownership. |

#### Tables

| File | Responsibility |
| --- | --- |
| `src/layout/column-calculator.ts` | Allocates fixed, percentage, auto and star column widths under min/max and available-width constraints. |
| `src/layout/table-processor.ts` | Per-table state and row lifecycle coordinator; owns the isolated page-vector registry, closes table/repeatable transactions and delegates border/row rendering. |
| `src/layout/table-processor.lifecycle.ts` | Initializes table widths, the per-pass vector registry, header/dont-break transactions and per-row padding/border reservations. |
| `src/layout/table-processor.rows.ts` | Draws row-segment vertical borders and fills across one or more pages, registering only rectangular outer fills that may need later corner rounding. |
| `src/layout/table-processor.borders.ts` | Draws horizontal/vertical table lines, applies layout styles/colors, resolves per-cell border precedence and closes rounded page fragments through structurally owned vector references. Route border-pagination defects here. |
| `src/layout/table-processor.helpers.ts` | Creates row-span geometry, propagates borders, detects explicit cell page breaks, computes table width and attaches page-aware table-vector tracking. |
| `src/layout/table-processor.constants.ts` | Accepted explicit page-break values used by tables. |
| `src/layout/table-processor.types.ts` | Resolved layout, row-span, processor collaborator and per-page table-vector registry contracts. |

#### Layout unit tests

| File | Focus |
| --- | --- |
| `src/layout/__tests__/layout-builder.test.ts` | General pagination, sizing, alignment and positioned output. |
| `src/layout/__tests__/layout-builder.sections.test.ts` | Section inheritance and page configuration. |
| `src/layout/__tests__/layout-builder.watermark.test.ts` | Watermark sizing and font behavior. |
| `src/layout/__tests__/element-writer.test.ts` | Base writing, fragments, events and page-number metadata. |
| `src/layout/__tests__/element-writer.page.test.ts` | Page breaks, repeatables, unbreakable blocks and columns. |
| `src/layout/__tests__/column-calculator.test.ts` | Fixed/auto/star/percentage width allocation and overflow constraints. |
| `src/layout/__tests__/table-processor.test.ts` | Table lifecycle, headers, row spans and border callbacks. |
| `src/layout/__tests__/table-processor.rows.test.ts` | Row-segment border/fill geometry. |
| `src/layout/__tests__/line.test.ts` | Inline insertion, widths and alignment. |
| `src/layout/__tests__/style-context-stack.test.ts` | Style inheritance, overrides and cyclic style protection. |

### `src/rendering/`: PDFKit translation

| File | Responsibility |
| --- | --- |
| `src/rendering/pdf-document.ts` | PDFKit subclass providing font, image, SVG, attachment, VFS, resource-policy and color integration. Route low-level PDFKit/resource embedding defects here. |
| `src/rendering/renderer.ts` | Iterates positioned pages/items, creates PDF pages, renders text/forms/outlines/watermarks and reports rendering progress. |
| `src/rendering/renderer.graphics.ts` | Renders vectors, clipping, gradients/patterns, images including rounded clipping/inset borders, SVG, QR, attachments and graphical links. |
| `src/rendering/renderer.helpers.ts` | Font lookup and text baseline offset helpers. |
| `src/rendering/renderer.types.ts` | Private renderable-page, font, resource, form and PDFKit option contracts. |
| `src/rendering/__tests__/pdf-document.test.ts` | Font/image/resource caches, policy checks and PDFDocument helpers. |
| `src/rendering/__tests__/renderer.test.ts` | Renderer lifecycle and shared graphic state. |
| `src/rendering/__tests__/renderer.lines.test.ts` | Text, inline images, links, destinations, forms and outlines. |
| `src/rendering/__tests__/renderer.graphics.test.ts` | Vectors, clipping, paths, gradients, patterns, media, links and attachments. |

### `src/output/`: runtime-specific consumption

| File | Responsibility |
| --- | --- |
| `src/output/output-document.ts` | Shared output wrapper and PDF stream contract; currently collects all chunks when a buffer-like result is requested. |
| `src/output/output-document.server.ts` | Node buffer/base64/data URL and filesystem writing adapter. |
| `src/output/output-document.browser.ts` | Browser buffer/base64/data URL/blob/download/open/print adapter. DOM use is intentionally confined here. |
| `src/output/__tests__/output-document.server.test.ts` | Node output conversion and file-writing behavior. |

### `src/types/`: public and internal contracts

| File | Responsibility |
| --- | --- |
| `src/types/index.ts` | Public type barrel for `pdfcraft/types`. |
| `src/types/common.types.ts` | Shared primitives such as color, margin, alignment, page break and dictionary. |
| `src/types/configuration.types.ts` | Instance and per-document creation options. |
| `src/types/content.types.ts` | Public content nodes, styles, tables, media (including raster border/radius options), forms, sections and dynamic content callbacks. |
| `src/types/document-definition.types.ts` | Top-level document definition, metadata, permissions, patterns, resources and page callbacks. |
| `src/types/output-document.types.ts` | Public Node/browser output capabilities and runtime-neutral browser object shapes. |
| `src/types/resource.types.ts` | Fonts, VFS, URL/local policies, headers and resource references. |
| `src/types/layout.types.ts` | Page dimensions, margins, positioned items and geometry contracts. |
| `src/types/table.types.ts` | Generic table, width, offset and resolved layout contracts. |
| `src/types/text.types.ts` | Generic measured font/inline/line/list-marker contracts. |
| `src/types/rendering.types.ts` | Page items, vectors, callbacks and rendering resource containers. |
| `src/types/document.types.ts` | Generic node lifecycle from public to preprocessed/measured/layout nodes and their internal metadata. |
| `src/types/internal.ts` | Internal type barrel used by implementation modules; never treat it as a stable public API. |
| `src/types/vendor.d.ts` | Missing/augmented declarations for bundled third-party modules. |
| `src/types/__tests__/document-node-types.test.ts` | Compile/runtime assertions for node-stage type relationships. |

### `src/utils/`: shared low-level helpers

| File | Responsibility |
| --- | --- |
| `src/utils/bytes.ts` | Runtime-neutral base64/byte/string/ArrayBuffer conversion. |
| `src/utils/clone-document-definition.ts` | Cycle-safe cloning that preserves non-plain objects and binary references while duplicating document occurrences. |
| `src/utils/event-emitter.ts` | Typed synchronous event emitter used by context/writer composition. |
| `src/utils/node.ts` | Node IDs, safe diagnostics and resolved margin extraction. |
| `src/utils/tools.ts` | Object packing, vector offsets and static-to-dynamic content conversion. |
| `src/utils/variable-type.ts` | Shared runtime type predicates. |
| `src/utils/__tests__/clone-document-definition.test.ts` | Cycles, shared references, functions, dates and binary clone behavior. |
| `src/utils/__tests__/event-emitter.test.ts` | Listener registration/removal/emission. |
| `src/utils/__tests__/node.test.ts` | Diagnostics, IDs and margin resolution. |
| `src/utils/__tests__/variable-type.test.ts` | Runtime predicate behavior. |

### `src/vendor/`: embedded algorithms

| File | Responsibility |
| --- | --- |
| `src/vendor/qr/qr-encoder.ts` | Embedded QR encoding implementation. Keep modifications isolated and regression-tested because it replaces an external runtime dependency. |

## `tests/`: cross-module validation

### Integration tests

| File | Focus |
| --- | --- |
| `tests/integration/integration-test.helpers.ts` | Shared font setup, page rendering and geometric assertions. |
| `tests/integration/basics.test.ts` | Basic document creation and common content. |
| `tests/integration/alignment.test.ts` | Horizontal/vertical/table alignment behavior. |
| `tests/integration/columns.test.ts` | Standard and nested column pagination. |
| `tests/integration/snaking-columns.test.ts` | Snaking column order, transitions and tables. |
| `tests/integration/tables.test.ts` | Table widths, spans, heights, fills, borders, pagination, headers and upstream regressions. |
| `tests/integration/lists.test.ts` | Ordered/unordered/nested lists and multi-page markers. |
| `tests/integration/images.test.ts` | Raster sizing, caching, URL/VFS/binary inputs and placement. |
| `tests/integration/svgs.test.ts` | SVG resources, sizing, data URLs and placement. |
| `tests/integration/background.test.ts` | Background layers and page-count callbacks. |
| `tests/integration/dynamic-page-margins.test.ts` | Dynamic margin convergence and page-local geometry. |
| `tests/integration/page-break-before.test.ts` | Callback node lists, positions, convergence and loop prevention. |
| `tests/integration/sections.test.ts` | Section page setup and repeatable inheritance. |
| `tests/integration/shared-references.test.ts` | Reused nodes/rows and isolation after cloning. |
| `tests/integration/acroforms.test.ts` | Form creation, font strings and PDF structure. |
| `tests/integration/encrypted-links.test.ts` | External/internal links in encrypted PDFs. |
| `tests/integration/jpeg-stream.test.ts` | JPEG XObject creation and PDF.js decoding. |

### Browser and consumer tests

| File | Focus |
| --- | --- |
| `tests/browser/browser-entry.test.ts` | Real browser import, browser-loaded fonts, Blob/download/open/print and interactive form preview. |
| `tests/consumer/package-exports.test.ts` | Installed-package export map and Node ESM/CJS consumption. |

### Public type tests

| File | Focus |
| --- | --- |
| `tests/types/package.ts` | Node ESM public API/type contract. |
| `tests/types/package.cjs.cts` | Node CommonJS public API/type contract. |
| `tests/types/browser.ts` | Browser public API/type contract. |
| `tests/types/tsconfig.node.json` | Isolated Node type-test compiler settings. |
| `tests/types/tsconfig.browser.json` | Isolated browser type-test compiler settings. |

### Manual visual regression

| File | Responsibility |
| --- | --- |
| `tests/visual/cases.mjs` | Deterministic definitions for width, span, row-height, canvas-offset and pagination-border visual checks. |
| `tests/visual/generate.mjs` | Builds all visual definitions into generated PDF files. |
| `tests/visual/README.md` | Viewer/zoom checklist and expected geometry for each visual PDF. |

## Issue routing matrix

| Symptom or proposal | First files to inspect | Primary regression location |
| --- | --- | --- |
| Invalid/misleading document-structure error | `preprocessing/doc-preprocessor.ts`, public content types | colocated preprocessor tests |
| Public TypeScript API mismatch | `src/types/*`, runtime validator/consumer | `tests/types/*`, consumer tests |
| Wrong font/style/text width or wrapping | `text/*`, `measurement/doc-measure.ts`, style stack | colocated text/measurement tests, integration basics |
| Auto/star/percentage/colSpan width | `doc-measure.table.ts`, `column-calculator.ts` | column-calculator unit + tables integration |
| Table row height/page break/header/rowSpan | `layout-builder.rows.ts`, `layout-builder.table*.ts`, `table-processor*.ts` | tables integration + visual case when geometric |
| Table border/fill disappears or duplicates | `table-processor.borders.ts`, `table-processor.rows.ts` | tables integration and pagination visual PDF |
| Columns/snaking columns | `document-context.columns.ts`, `document-context.snaking.ts`, writers | columns/snaking integration |
| Header/footer/background/watermark | repeatables, watermark, page context | background/sections/dynamic-margin integration |
| `pageBreakBefore` wrong nodes or loop | layout builder page-break passes | `page-break-before.test.ts` |
| Image/SVG/attachment loading | printer resources, URL resolver, VFS, PDFDocument | resource unit + media integration |
| Vector/path/clipping/render order | renderer graphics | renderer graphics unit + visual PDF |
| Links/outlines/forms/encryption | renderer, PDFDocument, PDFKit options | dedicated integration tests |
| Node output/file writing | shared/server output | server output tests + consumer test |
| Browser Blob/download | browser output and browser entry | Playwright browser tests |
| Web Worker | browser entry and output adapters | a dedicated real Worker browser test is required |
| Memory/streaming/very large documents | core printer, layout page retention, renderer, output collection | benchmarks plus large integration smoke |

## Feasibility classification

Before implementing an issue, classify it into one of these groups.

### A. Existing behavior defect

Criteria:

- the public API already promises the behavior;
- a minimal definition reproduces incorrect output;
- the fix can preserve existing valid definitions.

Action: add the reproduction as a failing test, fix the owning layer, update the changelog. Patch releases are normally appropriate.

### B. Compatible extension

Criteria:

- the behavior does not exist but fits an existing node/options model;
- default behavior remains unchanged;
- runtime and public types can be added without ambiguity.

Action: define acceptance criteria, update types and implementation, add unit/integration/browser tests as relevant, examples and changelog. Minor releases are normally appropriate.

### C. Architectural feature

Typical examples:

- true incremental layout;
- HTML/CSS or Markdown engines;
- footnotes affecting pagination;
- generic z-index/layer reordering;
- horizontal table pagination;
- arbitrary block containers with fragmentation/radius semantics.

Action: write a design first. Specify unsupported interactions, memory model, pagination semantics and migration path. Do not implement it as a local patch in renderer or table code.

### D. Already covered

Check `CHANGELOG.md`, current public types, tests and visual cases. Add the upstream reproduction only if current coverage does not prove the exact behavior.

### E. Out of scope or viewer/dependency-specific

Confirm whether the failure belongs to PDFKit, Fontkit, SVG-to-PDFKit, PDF.js or a particular viewer. Do not add unstable geometry workarounds without cross-viewer evidence.

## Global features that constrain refactors

The following require knowledge beyond the current page and prevent naive streaming or page-local rewrites:

- `pageBreakBefore` and its preceding/following node lists;
- total-page-aware margins, backgrounds, headers and footers;
- TOCs, page references and direct page links;
- repeated table headers and row spans crossing pages;
- unbreakable blocks and keep-with-header transactions;
- sections changing page size, orientation or repeatables;
- outlines, named destinations and forms;
- font subsetting and reusable images/resources.

Any incremental-generation proposal must either preserve these features with a multi-pass/indexing strategy or reject them explicitly in a separate restricted API.

## Required analysis workflow for an upstream issue

1. Read the issue JSON and any attached reproduction. Treat screenshots alone as insufficient when geometry cannot be inferred.
2. Search `CHANGELOG.md` for the issue number, title and related behavior.
3. Search public types to determine whether the behavior is promised.
4. Run or port the smallest reproduction against current PDFCraft.
5. Identify the first incorrect stage: preprocessing, measurement, layout, rendering, resources or output.
6. Check neighboring regression tests and invariants before selecting a fix.
7. Decide whether the result is a bug, compatible extension, architectural feature, already covered case or out-of-scope request.
8. For a fix, add the regression near the owning code and an integration/visual test when the failure crosses stages.
9. Validate Node and browser contracts if shared production code or public types changed.
10. Add the outcome and upstream link to `CHANGELOG.md`.

An AI should answer an issue review with:

- reproducible now: yes/no/not enough information;
- classification: bug/extension/architecture/already covered/out of scope;
- owning stage and exact files;
- affected public API and compatibility risk;
- required tests and visual checks;
- expected release level;
- known interactions or limitations.

## Validation commands

Use the smallest relevant command while iterating, then the complete applicable set before handoff.

```sh
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:browser
npm run test:types
npm run test:consumer
npm run lint
npm run format:check
npm run build
npm run check:size
```

Additional workflows:

```sh
npm run benchmark:quick
npm run benchmark
npm run visual:generate
npm run analyze:dependencies
```

`npm test` runs the main build, contracts, unit, integration, browser, lint and formatting sequence. Browser tests require permission to open a temporary local listening port in restricted environments.
