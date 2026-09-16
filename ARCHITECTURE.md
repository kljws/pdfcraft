# PDFCraft architecture

This document is the architectural map of PDFCraft. It is intended to give a maintainer or an AI enough context to:

- locate the code path responsible for a reported behavior;
- distinguish a bug from a new feature or an architectural change;
- estimate whether a pdfmake issue is applicable to PDFCraft;
- identify the public contracts, implementation files and tests that must change together;
- avoid reintroducing behavior already fixed and documented in `CHANGELOG.md`.

Its file-by-file scope is deliberately limited to package source/tests and root cross-package tests.
Other repository files and directories are not catalogued here.

## Product boundaries

PDFCraft is a TypeScript document-definition-to-PDF engine based historically on pdfmake 0.3.11. It now has its own public API, validation, resource policies, Node.js/browser outputs, layout extensions and tests.

Supported runtime targets:

- Node.js 22 and newer through `@pdfcraft/core`;
- modern browsers through the ESM-only `@pdfcraft/browser` export;
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
  ├─ DocMeasure + TextInlines + optional content extensions + ColumnCalculator
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
9. Unit tests stay beside package source under `src/**/__tests__/`. Package integration and public type tests stay under that package's `tests/`; root `tests/` is reserved for cross-package validation and manual visual cases.
10. Every release-relevant change must be recorded in `CHANGELOG.md` with the upstream issue or PR link when applicable.
11. Global document, page, font, style, resource, preprocessing, measurement, layout and rendering services must not import concrete built-in features. Concrete feature selection belongs exclusively in composition roots.

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

### `@pdfcraft/core`

The Node.js entry is `packages/core/src/index.ts`. It creates `OutputDocumentServer`, exposes filesystem writing and accepts local font/file paths subject to `LocalAccessPolicy`.

### `@pdfcraft/browser`

The browser entry is `packages/browser/src/index.ts`. It bundles the PDFKit standalone build and exposes blobs, downloads, opening and printing. The layout engine itself does not require the DOM; only browser output convenience methods do.

### `@pdfcraft/core/types`

The type-only entry is `packages/core/src/types/index.ts`. It must remain runtime-neutral and must not import executable Node or browser code.

## `packages/core/src/`: production source

### Entry points

| File | Responsibility |
| --- | --- |
| `packages/core/src/index.ts` | Node entry. Specializes `PdfCraftBase` with `OutputDocumentServer` and exports the default instance plus factory/class access. |
| `packages/browser/src/index.ts` | Browser entry. Adds VFS/font-container helpers and specializes output as `OutputDocumentBrowser`. |

### `packages/core/src/core/`: orchestration

| File | Responsibility |
| --- | --- |
| `packages/core/src/core/pdfcraft.ts` | Public instance state and `createPdf()` lifecycle: validates arguments, merges instance/document options, clones definitions, configures resource policies and creates a printer. Start here for API lifecycle, instance isolation and option precedence. |
| `packages/core/src/core/printer.ts` | Central generation coordinator: resolves resources, normalizes document/PDFKit options, creates `PDFDocument`, invokes layout, limits pages and invokes the renderer. Start here for whole-document behavior and memory/streaming questions. |
| `packages/core/src/core/printer.helpers.ts` | Pure helpers for resolved images, metadata, embedded files and infinite-page height calculation. |
| `packages/core/src/core/printer.resources.ts` | Resolves global font/image/file references, delegates feature resources through composition, converts URLs into VFS keys and waits for resolution. |
| `packages/core/src/core/printer.types.ts` | Internal printer definition, resource and PDFKit option contracts. These are not the public document-definition types. |

Tests:

| File | Focus |
| --- | --- |
| `packages/core/src/core/__tests__/pdfcraft.test.ts` | Instance isolation, cloning, option precedence, policies and public creation behavior. |
| `packages/core/src/core/__tests__/printer.test.ts` | Printer orchestration, options and document creation. |
| `packages/core/src/core/__tests__/printer.helpers.test.ts` | Metadata/resources/helper calculations. |
| `packages/core/src/core/__tests__/printer.resources.test.ts` | URL, binary and attachment resolution routing. |

### `packages/core/src/composition/`: built-in composition roots

| File | Responsibility |
| --- | --- |
| `packages/core/src/composition/built-in-feature-registry.ts` | Maps built-in feature names to concrete matchers and binds ordered stage processors; concrete feature knowledge stays in composition. |
| `packages/core/src/composition/built-in-element-placement.ts` | Adapts image, canvas, extension, attachment and AcroForm placement features to the feature-neutral element-writer port. |
| `packages/core/src/composition/built-in-document-features.ts` | Wires background, header/footer and watermark features to preprocessing, measurement, page writing and font-aware watermark measurement without exposing those concrete collaborators to features. |
| `packages/core/src/composition/built-in-document-pipeline.ts` | Creates document preprocessing/measurement services, runs each concrete layout pass with page writer and repeatables, and connects generic bounded relayout to `pageBreakBefore` plus registered-extension metadata. |
| `packages/core/src/composition/built-in-layout.ts` | Owns complete built-in layout dispatch, including primary/trailing order, extension fallback, unknown-node errors and feature-specific decoration/reset hooks; creates stack/section/columns contexts, owns shared row-layout composition and decides initial-page ownership. `LayoutBuilder` retains only compatibility façades for recursive/row dispatch and subclass overrides. |
| `packages/core/src/composition/built-in-measurement.ts` | Creates shared image/text measurers, ordered handlers and concrete feature contexts; owns style-scoped node measurement, margin extension, extension fallback and unknown-node errors while preserving the `DocMeasure` façade. |
| `packages/core/src/composition/built-in-preprocessing.ts` | Owns shorthand normalization, ordered preprocessing handlers, concrete feature contexts, extension fallback and TOC registration while preserving the `DocPreprocessor` façade and subclass overrides. |
| `packages/core/src/composition/built-in-printer-resources.ts` | Connects attachment and registered-extension resource resolution to the feature-neutral printer resource workflow. |
| `packages/core/src/composition/built-in-rendering.ts` | Connects text, image, attachment, extension, AcroForm and watermark renderers to feature-neutral rendering façades. |

### `packages/core/src/engine/`: feature contracts

| File | Responsibility |
| --- | --- |
| `packages/core/src/engine/contracts/node-feature.ts` | Stage-oriented contract implemented by built-in vertical features. The engine may call features through this contract; features must not import one another. |
| `packages/core/src/engine/node-stage-dispatcher.ts` | Runs an ordered feature-stage handler list and returns the first matching result. |
| `packages/core/src/engine/layout-node-lifecycle.ts` | Applies feature-neutral node lifecycle rules around layout dispatch: page breaks, margins, detached positioning, unbreakable transactions, vertical alignment and page-span height. It also owns the shared vertical-alignment transaction contract. |
| `packages/core/src/engine/layout-pagination.ts` | Applies vertical spacing across pages and advances snaking content across columns/pages while preserving nested-column width state. |
| `packages/core/src/engine/page-break-before.types.ts` | Feature-neutral callback, navigation-helper and extension-metadata contracts for `pageBreakBefore`. |
| `packages/core/src/engine/document-layout-pipeline.ts` | Runs bounded layout passes until dynamic page counts, backgrounds, footer margins and requested page breaks converge, then returns positioned pages. |
| `packages/core/src/engine/reset-node-positions.ts` | Resets positioned nodes before any bounded relayout pass, independent of which documentary behavior requested the pass. |

### `packages/core/src/features/`: vertical built-in features

Built-in features own their preprocessing, measurement, layout, placement and rendering behavior.
They may depend on engine contracts and shared services, but must not import another feature directly.

| Path | Responsibility |
| --- | --- |
| `packages/core/src/features/acroform/acroform.feature.ts` | Typed block/inline AcroForm boundary composing validation, measurement, placement, layout and rendering. |
| `packages/core/src/features/acroform/preprocess-acroform.ts` | Validates field identifiers, supported types and dimensions before measurement. |
| `packages/core/src/features/acroform/measure-acroform.ts` | Measures block and inline fields and resolves the block field font. |
| `packages/core/src/features/acroform/place-acroform.ts` | Fits and positions block fields and emits AcroForm page items. |
| `packages/core/src/features/acroform/layout-acroform.ts` | Records block-field position and node ownership through the page writer. |
| `packages/core/src/features/acroform/render-acroform.ts` | Owns one-time PDFKit form initialization, font subsetting and rendering for every supported field type. |
| `packages/core/src/features/attachment/attachment.feature.ts` | Typed attachment-feature boundary and composition of all attachment stages. |
| `packages/core/src/features/attachment/attachment-resources.ts` | Resolves attachment URL references and validates resolved named attachment definitions. |
| `packages/core/src/features/attachment/measure-attachment.ts` | Applies attachment annotation dimensions. |
| `packages/core/src/features/attachment/layout-attachment.ts` | Records positioned attachment metadata through the page writer. |
| `packages/core/src/features/attachment/place-attachment.ts` | Applies attachment page-fit and cursor movement rules. |
| `packages/core/src/features/attachment/render-attachment.ts` | Resolves and renders PDFKit file annotations. |
| `packages/core/src/features/canvas/canvas.feature.ts` | Typed canvas-feature boundary. Canvas emits shared vector page items rather than owning a PDFKit renderer. |
| `packages/core/src/features/canvas/measure-canvas.ts` | Measures canvas primitives and path bounds. |
| `packages/core/src/features/canvas/layout-canvas.ts` | Records positions and node ownership for emitted vectors. |
| `packages/core/src/features/canvas/place-canvas.ts` | Applies canvas page-fit, alignment, vector insertion and cursor movement rules. |
| `packages/core/src/features/canvas/decorate-canvas.ts` | Captures and resets mutable vector coordinates across layout passes. |
| `packages/core/src/features/columns/columns.feature.ts` | Typed columns boundary composing detection, preprocessing, measurement and layout. |
| `packages/core/src/features/columns/preprocess-columns.ts` | Validates the columns array and recursively preprocesses every column. |
| `packages/core/src/features/columns/measure-columns.ts` | Measures children, resolves inherited column gaps and calculates aggregate min/max widths. |
| `packages/core/src/features/columns/layout-columns.ts` | Allocates column widths and delegates shared row layout through a narrow injected port. |
| `packages/core/src/features/extension/extension.feature.ts` | Feature-neutral adapter boundary composing every lifecycle stage supplied by registered external extensions. |
| `packages/core/src/features/extension/extension-registry.ts` | Finds a registered extension by node predicate or measured extension name. |
| `packages/core/src/features/extension/resolve-extension-resources.ts` | Delegates document resource resolution to registered extensions. |
| `packages/core/src/features/extension/measure-extension.ts` | Supplies document, VFS, style and shared box-measurement capabilities to the matching extension. |
| `packages/core/src/features/extension/layout-extension.ts` | Records extension positions and node ownership through the page writer. |
| `packages/core/src/features/extension/place-extension.ts` | Applies extension page-fit, alignment and cursor movement rules. |
| `packages/core/src/features/extension/render-extension.ts` | Resolves extension fonts, delegates PDFKit rendering and emits common link annotations. |
| `packages/core/src/features/extension/extension-page-break.ts` | Copies extension-owned metadata into `pageBreakBefore` node information. |
| `packages/core/src/features/image/image.feature.ts` | Typed image-feature boundary and composition of all image stages. |
| `packages/core/src/features/image/preprocess-image.ts` | Normalizes serialized Node buffers into runtime bytes. |
| `packages/core/src/features/image/image-measurer.ts` | Resolves image resources and intrinsic dimensions, registers inline images and delegates shared box measurement. |
| `packages/core/src/features/image/layout-image.ts` | Records positioned image metadata through the page writer. |
| `packages/core/src/features/image/place-image.ts` | Applies image page-fit, alignment and cursor movement rules. |
| `packages/core/src/features/image/render-image.ts` | Renders image clipping, cover behavior, borders and link annotations through PDFKit. |
| `packages/core/src/features/list/list.feature.ts` | Typed ordered/unordered-list boundary composing detection, preprocessing, measurement and layout. Lists emit shared text-line or vector primitives and need no feature renderer. |
| `packages/core/src/features/list/preprocess-list.ts` | Validates list arrays and recursively preprocesses their items through an injected engine callback. |
| `packages/core/src/features/list/measure-list.ts` | Measures children, marker gaps, counters and list widths through injected child/text measurement capabilities. |
| `packages/core/src/features/list/list-markers.ts` | Builds unordered vectors and formats decimal, alphabetic and Roman ordered markers. |
| `packages/core/src/features/list/layout-list.ts` | Applies list indentation, attaches each marker to its first emitted line and aggregates child positions. |
| `packages/core/src/features/repeatables/background.feature.ts` | Resolves static or dynamic page backgrounds, preserves callback-arity semantics and lays content out as a detached full-page block. |
| `packages/core/src/features/repeatables/background.types.ts` | Narrow background callback and document-layout context contracts. |
| `packages/core/src/features/repeatables/header-footer.feature.ts` | Lays out per-page static or dynamic headers and footers, including detached overflow validation and measured footer heights. |
| `packages/core/src/features/repeatables/header-footer.types.ts` | Narrow document-layout context and callback contracts used by header/footer layout. |
| `packages/core/src/features/repeatables/page-break-before.feature.ts` | Builds body-node navigation metadata, evaluates `pageBreakBefore` and marks the first requested break for bounded relayout. |
| `packages/core/src/features/repeatables/measure-watermark.ts` | Normalizes watermark styles, resolves fonts and calculates fixed or automatic text dimensions through the shared typography service. |
| `packages/core/src/features/repeatables/watermark.feature.ts` | Resolves document or per-page watermark definitions, delegates font-aware measurement through a reduced context and composes PDFKit rendering. |
| `packages/core/src/features/repeatables/render-watermark.ts` | Renders measured watermarks at page center with their resolved font, angle, color and opacity. |
| `packages/core/src/features/repeatables/watermark.types.ts` | Watermark normalization, measurement and documentary layout contracts shared with layout and rendering. |
| `packages/core/src/features/section/section.feature.ts` | Typed section boundary composing root-only validation, child measurement and section page layout. |
| `packages/core/src/features/section/preprocess-section.ts` | Enforces root-level placement and recursively preprocesses section content. |
| `packages/core/src/features/section/measure-section.ts` | Measures section content through an injected engine callback. |
| `packages/core/src/features/section/resolve-section-page.ts` | Resolves inherited/default page size, orientation, margins, headers, footers, backgrounds and watermarks. |
| `packages/core/src/features/section/layout-section.ts` | Opens the required section page with resolved properties and delegates section content layout. |
| `packages/core/src/features/section/__tests__/` | Section page-property inheritance and default-resolution behavior. |
| `packages/core/src/features/stack/stack.feature.ts` | Typed vertical-stack boundary composing detection, ordinary/decorated preprocessing, measurement and layout. Decorated stacks use an injected table-preprocessing capability without importing the table feature. |
| `packages/core/src/features/stack/preprocess-stack.ts` | Validates stack content and recursively preprocesses children while preserving section permissions. |
| `packages/core/src/features/stack/preprocess-decorated-stack.ts` | Validates block decorations and lowers a decorated stack to the existing one-cell rounded-table representation. |
| `packages/core/src/features/stack/measure-stack.ts` | Measures children and resolves aggregate stack min/max widths. |
| `packages/core/src/features/stack/layout-stack.ts` | Processes children vertically, aggregates positions and applies paragraph gaps with page breaks. |
| `packages/core/src/features/table/table.feature.ts` | Typed table-feature boundary composing detection, preprocessing, intrinsic measurement and paginated layout. Table output remains shared vector/page-item data, so no dedicated PDFKit renderer is required. |
| `packages/core/src/features/table/preprocess-table.ts` | Validates table definitions, normalizes header/body groups and recursively preprocesses rectangular cell content. |
| `packages/core/src/features/table/table-body.ts` | Expands compact `colSpan`/`rowSpan` input into the strict rectangular internal table grid. |
| `packages/core/src/features/table/measure-table.ts` | Resolves section/group layouts, measures cells through an injected engine callback and calculates intrinsic table widths. |
| `packages/core/src/features/table/measure-table.helpers.ts` | Owns table-layout composition, border/padding offsets, width normalization and `colSpan`/`rowSpan` measurement helpers. |
| `packages/core/src/features/table/layout-table.ts` | Coordinates the per-table processor, validates dynamic row heights and delegates cell content through the injected row-layout host. |
| `packages/core/src/features/table/layout-row.ts` | Owns shared table/columns row and column-group layout, including page-break reconciliation, spans, fixed heights and cell vertical alignment. The built-in composition root supplies it to both features. |
| `packages/core/src/features/table/table-pagination.ts` | Owns table page-break metadata and row-span break reconciliation utilities shared with row layout. |
| `packages/core/src/features/table/table-processor.ts` | Coordinates per-table state and row lifecycle, including repeatables and isolated page-vector ownership. |
| `packages/core/src/features/table/table-processor.lifecycle.ts` | Initializes widths, layouts, row groups, headers and unbreakable transactions for each table pass. |
| `packages/core/src/features/table/table-processor.rows.ts` | Draws paginated row fills and vertical segments, including rounded fragments. |
| `packages/core/src/features/table/table-processor.borders.ts` | Draws table borders and closes rounded page fragments through structurally owned vectors. |
| `packages/core/src/features/table/table-processor.helpers.ts` | Provides span geometry, border propagation, explicit-break detection and table-vector tracking. |
| `packages/core/src/features/table/table-processor.constants.ts` | Defines explicit page-break values accepted inside table cells. |
| `packages/core/src/features/table/table-processor.types.ts` | Defines resolved-layout, span, processor and per-page vector-registry contracts. |
| `packages/core/src/features/table/__tests__/` | Table lifecycle, headers, spans, borders and row-segment fill geometry. |
| `packages/core/src/features/toc/toc.feature.ts` | Typed table-of-contents boundary composing TOC detection, item registration, preprocessing, measurement and layout. |
| `packages/core/src/features/toc/preprocess-toc.ts` | Registers text nodes as TOC items, reconciles declarations placed before or after their items and preprocesses optional titles. |
| `packages/core/src/features/toc/measure-toc.ts` | Sorts TOC items, builds the internal two-column page-reference table and measures it through an injected engine callback. |
| `packages/core/src/features/toc/layout-toc.ts` | Emits the optional title and measured internal table while honoring `hideEmpty`. |
| `packages/core/src/features/text/text.feature.ts` | Typed text-feature boundary composing text detection, preprocessing, measurement, line construction, layout and rendering. |
| `packages/core/src/features/text/preprocess-text.ts` | Normalizes text values and nested fragments; TOC registration and document-wide node references are supplied through injected callbacks. |
| `packages/core/src/features/text/measure-text.ts` | Resolves referenced text and builds measured inline data through injected text services and styles. |
| `packages/core/src/features/text/build-text-line.ts` | Consumes measured inlines into width-constrained lines and owns hard wrapping. |
| `packages/core/src/features/text/layout-text.ts` | Places text lines, records references/outlines and reflows text across page or snaking-column breaks. |
| `packages/core/src/features/text/render-text.ts` | Renders line backgrounds, text, inline images, links, destinations and decorations through PDFKit; inline form rendering is injected by the AcroForm composition root. |
| `packages/core/src/features/text/text-breaker.ts` | Uses Unicode line breaking, whitespace rules and explicit break-all behavior to split text into words/fragments. |
| `packages/core/src/features/text/text-inlines.ts` | Flattens nested text, measures media inlines, hard-wraps long tokens and builds line-ready inline data through shared typography metrics. |
| `packages/core/src/features/text/text-decorator.ts` | Groups and renders text backgrounds, underline, overline and line-through geometry. |
| `packages/core/src/features/text/text.types.ts` | Private contracts shared by breaker, inline measurement and decoration. |
| `packages/core/src/features/text/__tests__/` | Unicode breaking, inline shaping, measurements and decoration geometry. |

### `packages/core/src/services/`: feature-neutral services

| Path | Responsibility |
| --- | --- |
| `packages/core/src/services/measurement/measure-box.ts` | Applies shared intrinsic box sizing, constraints and alignment for built-in or extension content without depending on any feature. |
| `packages/core/src/services/styles/style-context-stack.ts` | Resolves inherited, default, named and local style properties independently from pagination. |
| `packages/core/src/services/styles/__tests__/style-context-stack.test.ts` | Style inheritance, overrides, copying and cyclic style protection. |
| `packages/core/src/services/typography/font.types.ts` | Shared PDF font-file, style and embedded-font contracts owned by typography rather than rendering. |
| `packages/core/src/services/typography/font-provider.ts` | Resolves font families/styles, loads VFS or local sources, embeds through a narrow PDFKit host and caches embedded fonts. |
| `packages/core/src/services/typography/__tests__/font-provider.test.ts` | Font-style resolution, errors, embedding cache, local validation and VFS collection-font loading. |
| `packages/core/src/services/typography/text-metrics.ts` | Resolves font-backed text styles and calculates plain or rotated text dimensions without depending on the text feature. |
| `packages/core/src/services/references/preprocess-node-references.ts` | Owns document-wide `id`, `pageReference` and `textReference` registration/mutation against an injected reference registry. |
| `packages/core/src/services/references/__tests__/preprocess-node-references.test.ts` | Forward page/text references, nested-parent ownership and duplicate-ID rejection. |
| `packages/core/src/services/resources/resource-reference.ts` | Detects string and URL-object resource references without depending on a document feature. |

### `packages/core/src/configuration/`: page and built-in layout configuration

| File | Responsibility |
| --- | --- |
| `packages/core/src/configuration/page-size.constants.ts` | Canonical named PDF page dimensions. |
| `packages/core/src/configuration/page-size.ts` | Resolves named/custom page sizes, orientation and static/dynamic margins. |
| `packages/core/src/configuration/table-layouts.ts` | Built-in table layouts and the default resolved layout callbacks. |
| `packages/core/src/configuration/__tests__/table-layouts.test.ts` | Built-in layout callback and default-border behavior. |

### `packages/core/src/resources/`: external and virtual resources

| File | Responsibility |
| --- | --- |
| `packages/core/src/resources/virtual-file-system.ts` | Runtime-neutral in-memory byte store used for fonts, images, attachments and extension resources. |
| `packages/core/src/resources/url-resolver.ts` | Fetches HTTP(S) resources once, enforces URL policy before/after redirects and stores results in the VFS. |
| `packages/core/src/resources/__tests__/virtual-file-system.test.ts` | VFS encoding, byte-copy and path-normalization behavior. |
| `packages/core/src/resources/__tests__/url-resolver.test.ts` | Fetch caching, redirects, failures and access-policy enforcement. |

### `packages/core/src/preprocessing/`: structural normalization

| File | Responsibility |
| --- | --- |
| `packages/core/src/preprocessing/doc-preprocessor.ts` | Owns per-document preprocessing/reference state, recursive entry points and compatibility façades. Normalization, dispatch and concrete feature contexts are supplied by preprocessing composition. |
| `packages/core/src/preprocessing/__tests__/doc-preprocessor.test.ts` | Supported shorthand, invalid structures and dimensions, rectangular table-grid constraints, section constraints, spans and preprocessing errors. |

### `packages/core/src/measurement/`: intrinsic sizing

| File | Responsibility |
| --- | --- |
| `packages/core/src/measurement/doc-measure.ts` | Owns shared style/document state and retains stable recursive plus feature-specific measurement façades. Node lifecycle and concrete dispatch are supplied by measurement composition. |
| `packages/core/src/measurement/__tests__/doc-measure.test.ts` | General node, style, media, extension, list, column and table measurement behavior. |

### `packages/core/src/document/`: mutable pagination state

| File | Responsibility |
| --- | --- |
| `packages/core/src/document/document-context.ts` | Owns pages, current coordinates, available space, base/effective margins, footer bottom-margin overrides, columns, transactions and page creation state. It is the central mutable state used by writers. |
| `packages/core/src/document/document-context.geometry.ts` | Page size/orientation resolution and bottom-most coordinate helpers. |
| `packages/core/src/document/document-context.helpers.ts` | Page creation/position helpers and nested-snaking detection. |
| `packages/core/src/document/document-context.columns.ts` | Standard column-group lifecycle, ending cells and bottom reconciliation. |
| `packages/core/src/document/document-context.snaking.ts` | Snaking-column snapshots, transitions and page resets. |
| `packages/core/src/document/document-context.types.ts` | Context snapshots, page positions, column-ending and event contracts. |
| `packages/core/src/document/__tests__/document-context.test.ts` | Geometry, pages, standard/snaking columns, snapshots and transitions. |

### `packages/core/src/layout/`: pagination and positioned page items

#### Main builder

| File | Responsibility |
| --- | --- |
| `packages/core/src/layout/layout-builder.ts` | Holds mutable per-document layout state and retains compatibility façades used by recursive dispatch and subclasses. Processor creation, concrete passes and feature contexts are owned by composition; convergence and generic node lifecycle live in the engine layer. |
| `packages/core/src/layout/node.decorators.ts` | Captures/restores common node coordinates and delegates feature-specific decoration/reset through neutral hooks. |

#### Writers and lines

| File | Responsibility |
| --- | --- |
| `packages/core/src/layout/element-writer.ts` | Feature-neutral positioned-item writer and stable façade for primitive placement, context management and vector-insertion tracking; feature page items arrive through an injected placement adapter. |
| `packages/core/src/layout/element-writer.fragments.ts` | Replays cloned fragment items into the active page, updating coordinates, node page numbers, background ordering and vector-insertion ownership. |
| `packages/core/src/layout/element-writer.page.ts` | Page-aware writer: automatic page changes, repeatable blocks, unbreakable transactions and column transitions. |
| `packages/core/src/layout/page-item-geometry.ts` | Calculates positioned-item bottoms, automatic page height and node height across one or more laid-out pages. |
| `packages/core/src/layout/element-writer.helpers.ts` | Shared box alignment, fragment height and page-item insertion helpers. |
| `packages/core/src/layout/vector-insertion.ts` | Attaches insertion listeners to vectors and notifies their structural owners after direct or cloned-fragment insertion. |
| `packages/core/src/layout/line.ts` | Mutable laid-out text line: inline insertion, width, ascender/height and alignment. |
| `packages/core/src/layout/page-item-geometry.ts` | Computes vector/page-item lower bounds for layout calculations. |
| `packages/core/src/layout/node.decorators.ts` | Adds layout lifecycle callbacks/metadata to nodes without inheritance. |

#### Shared grid sizing

| File | Responsibility |
| --- | --- |
| `packages/core/src/layout/column-calculator.ts` | Allocates fixed, percentage, auto and star column widths under min/max and available-width constraints. |

#### Layout unit tests

| File | Focus |
| --- | --- |
| `packages/core/src/layout/__tests__/layout-builder.test.ts` | General pagination, sizing, alignment and positioned output. |
| `packages/core/src/features/repeatables/__tests__/measure-watermark.test.ts` | Watermark sizing and font behavior. |
| `packages/core/src/layout/__tests__/element-writer.test.ts` | Base writing, fragments, events and page-number metadata. |
| `packages/core/src/layout/__tests__/element-writer.page.test.ts` | Page breaks, repeatables, unbreakable blocks and columns. |
| `packages/core/src/layout/__tests__/column-calculator.test.ts` | Fixed/auto/star/percentage width allocation and overflow constraints. |
| `packages/core/src/layout/__tests__/line.test.ts` | Inline insertion, widths and alignment. |

### `packages/core/src/rendering/`: PDFKit translation

| File | Responsibility |
| --- | --- |
| `packages/core/src/rendering/pdf-document.ts` | PDFKit adapter exposing stable font façades and providing image, attachment, pattern, metadata, resource-policy and color integration. Font selection, loading and caching belong to the typography service. |
| `packages/core/src/rendering/renderer.ts` | Iterates positioned pages/items, creates PDF pages, delegates feature items through an injected rendering composition and reports progress. |
| `packages/core/src/rendering/renderer.graphics.ts` | Coordinates feature-neutral vector/clipping/vertical-alignment lifecycle and delegates feature items through an injected rendering port. |
| `packages/core/src/rendering/vector-renderer.ts` | Owns cached PDFKit vector state and renders paths, shapes, strokes, fills, gradients and patterns. |
| `packages/core/src/rendering/clipping-renderer.ts` | Owns nested clipping depth, rectangle validation and vector-state invalidation around PDFKit save/restore operations. |
| `packages/core/src/rendering/render-vertical-alignment.ts` | Applies and restores table-cell vertical translations. |
| `packages/core/src/rendering/renderer.helpers.ts` | Shared font lookup helper. |
| `packages/core/src/rendering/renderer.types.ts` | Private renderable-page, font, resource, form and PDFKit option contracts. |
| `packages/core/src/rendering/__tests__/pdf-document.test.ts` | Font/image/resource caches, policy checks and PDFDocument helpers. |
| `packages/core/src/rendering/__tests__/renderer.test.ts` | Renderer lifecycle and shared graphic state. |
| `packages/core/src/rendering/__tests__/renderer.lines.test.ts` | Text, inline images, links, destinations, forms and outlines. |
| `packages/core/src/rendering/__tests__/renderer.graphics.test.ts` | Vectors, clipping, paths, gradients, patterns, media, links and attachments. |

### `packages/core/src/output/`: runtime-specific consumption

| File | Responsibility |
| --- | --- |
| `packages/core/src/output/output-document.ts` | Shared output wrapper and PDF stream contract; currently collects all chunks when a buffer-like result is requested. |
| `packages/core/src/output/output-document.server.ts` | Node buffer/base64/data URL and filesystem writing adapter. |
| `packages/browser/src/output-document.browser.ts` | Browser buffer/base64/data URL/blob/download/open/print adapter. DOM use is intentionally confined here. |
| `packages/core/src/output/__tests__/output-document.server.test.ts` | Node output conversion and file-writing behavior. |

### `packages/core/src/types/`: public and internal contracts

| File | Responsibility |
| --- | --- |
| `packages/core/src/types/index.ts` | Public type barrel for `@pdfcraft/core/types`. |
| `packages/core/src/types/common.types.ts` | Shared primitives such as color, margin, alignment, page break and dictionary. |
| `packages/core/src/types/configuration.types.ts` | Instance and per-document creation options. |
| `packages/core/src/types/content.types.ts` | Public content nodes, styles, tables (including partial logical-group layout callbacks), media, forms, sections and dynamic content callbacks. |
| `packages/core/src/types/document-definition.types.ts` | Top-level document definition, metadata, permissions, patterns, resources and page callbacks. |
| `packages/core/src/types/output-document.types.ts` | Public Node/browser output capabilities and runtime-neutral browser object shapes. |
| `packages/core/src/types/resource.types.ts` | Fonts, VFS, URL/local policies, headers and resource references. |
| `packages/core/src/types/layout.types.ts` | Page dimensions, margins, positioned items and geometry contracts. |
| `packages/core/src/types/table.types.ts` | Generic table, width, offset and resolved layout contracts. |
| `packages/core/src/types/text.types.ts` | Generic measured font/inline/line/list-marker contracts. |
| `packages/core/src/types/rendering.types.ts` | Page items, vectors, measured watermark output, callbacks and rendering resource containers. |
| `packages/core/src/types/document.types.ts` | Generic node lifecycle from public to preprocessed/measured/layout nodes and their internal metadata. |
| `packages/core/src/types/internal.ts` | Internal type barrel used by implementation modules; never treat it as a stable public API. |
| `packages/core/src/types/vendor.d.ts` | Missing/augmented declarations for bundled third-party modules. |
| `packages/core/src/types/__tests__/document-node-types.test.ts` | Compile/runtime assertions for node-stage type relationships. |

### `packages/core/src/utils/`: shared low-level helpers

| File | Responsibility |
| --- | --- |
| `packages/core/src/utils/bytes.ts` | Runtime-neutral base64/byte/string/ArrayBuffer conversion. |
| `packages/core/src/utils/clone-document-definition.ts` | Cycle-safe cloning that preserves non-plain objects and binary references while duplicating document occurrences. |
| `packages/core/src/utils/event-emitter.ts` | Typed synchronous event emitter used by context/writer composition. |
| `packages/core/src/utils/node.ts` | Node IDs, safe diagnostics and resolved margin extraction. |
| `packages/core/src/utils/canvas-path-bounds.ts` | Computes canvas path-vector bounds for measurement and automatic page geometry. |
| `packages/core/src/utils/tools.ts` | Object packing, vector offsets and static-to-dynamic content conversion. |
| `packages/core/src/utils/variable-type.ts` | Shared runtime type predicates. |
| `packages/core/src/utils/__tests__/clone-document-definition.test.ts` | Cycles, shared references, functions, dates and binary clone behavior. |
| `packages/core/src/utils/__tests__/event-emitter.test.ts` | Listener registration/removal/emission. |
| `packages/core/src/utils/__tests__/node.test.ts` | Diagnostics, IDs and margin resolution. |
| `packages/core/src/utils/__tests__/variable-type.test.ts` | Runtime predicate behavior. |

### Optional extension packages

| File | Responsibility |
| --- | --- |
| `packages/qr/src/vendor/qr-encoder.ts` | Embedded QR encoding implementation converted to built-in canvas vectors by `@pdfcraft/qr`. |
| `packages/svg/src/types.ts` | Public SVG node, renderer option and document-resource types. |
| `packages/svg/src/extension/svg-extension.ts` | Extension lifecycle composition and SVG measurement orchestration. |
| `packages/svg/src/measurement/svg-measure.ts` | SVG parsing, intrinsic dimension measurement and rendered-dimension writing. |
| `packages/svg/src/resources/svg-resources.ts` | Named resource, VFS, byte-array and SVG data-URL resolution. |
| `packages/svg/src/renderer/render-svg.ts` | PDFCraft-to-SVG renderer adapter and font resolution. |
| `packages/svg/src/vendor/svg-to-pdfkit.ts` | Typed SVG-to-PDFKit 0.1.8 option normalization and render orchestration. |
| `packages/svg/src/vendor/renderer/runtime.types.ts` | Shared per-render state and module-installer contracts. |
| `packages/svg/src/vendor/renderer/context.ts` | Per-render state and deterministic renderer-module installation. |
| `packages/svg/src/vendor/renderer/pdfkit/bridge.ts` | Low-level PDFKit groups, masks, patterns, text, colors and link annotations. |
| `packages/svg/src/vendor/renderer/parsing`, `xml`, `css`, `geometry`, `text` | Token parsing, XML parsing, CSS/color resolution, matrix/path geometry and font metrics. |
| `packages/svg/src/vendor/renderer/elements` | Base, container, shape, paint and text SVG element implementations. |

Core owns only a feature-neutral extension lifecycle: detection, resource resolution, measurement,
box layout and optional rendering. QR/SVG node types and behavior exist only in their packages.
Consumers register optional implementations through `createPdfCraft({ extensions })` or
`addExtensions()`.

## Package and workspace validation

### Core integration tests

| File | Focus |
| --- | --- |
| `packages/core/tests/integration/integration-test.helpers.ts` | Shared font setup, page rendering and geometric assertions. |
| `packages/core/tests/integration/basics.test.ts` | Basic document creation and common content. |
| `packages/core/tests/integration/alignment.test.ts` | Horizontal/vertical/table alignment behavior. |
| `packages/core/tests/integration/columns.test.ts` | Standard and nested column pagination. |
| `packages/core/tests/integration/snaking-columns.test.ts` | Snaking column order, transitions and tables. |
| `packages/core/tests/integration/tables.test.ts` | Table widths, spans, heights, fills, borders, pagination, headers, partial group-layout inheritance and upstream regressions. |
| `packages/core/tests/integration/lists.test.ts` | Ordered/unordered/nested lists and multi-page markers. |
| `packages/core/tests/integration/images.test.ts` | Raster sizing, caching, URL/VFS/binary inputs and placement. |
| `packages/core/tests/integration/background.test.ts` | Background layers and page-count callbacks. |
| `packages/core/tests/integration/dynamic-page-margins.test.ts` | Dynamic margin convergence and page-local geometry. |
| `packages/core/tests/integration/page-break-before.test.ts` | Callback node lists, positions, convergence and loop prevention. |
| `packages/core/tests/integration/sections.test.ts` | Section page setup and repeatable inheritance. |
| `packages/core/tests/integration/shared-references.test.ts` | Reused nodes/rows and isolation after cloning. |
| `packages/core/tests/integration/acroforms.test.ts` | Form creation, font strings and PDF structure. |
| `packages/core/tests/integration/encrypted-links.test.ts` | External/internal links in encrypted PDFs. |
| `packages/core/tests/integration/jpeg-stream.test.ts` | JPEG XObject creation and PDF.js decoding. |

### Browser, extension and consumer tests

| File | Focus |
| --- | --- |
| `packages/browser/tests/browser-entry.test.ts` | Real browser import, browser-loaded fonts, Blob/download/open/print and interactive form preview. |
| `packages/svg/tests/integration/svg.test.ts` | SVG resources, sizing, data URLs and placement through core. |
| `tests/consumer/package-exports.test.ts` | Installed-package export map and Node ESM/CJS consumption. |

### Public type tests

| File | Focus |
| --- | --- |
| `packages/core/tests/types/package.ts` | Node ESM public API/type contract. |
| `packages/core/tests/types/package.cjs.cts` | Node CommonJS public API/type contract. |
| `packages/browser/tests/types/package.ts` | Browser public API/type contract and optional-extension compatibility. |
| `packages/qr/tests/types/package.ts` | QR node augmentation contract. |
| `packages/svg/tests/types/package.ts` | SVG node/resource augmentation contract without ambient DOM types. |

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
| Public TypeScript API mismatch | package public types, runtime validator/consumer | owning package's `tests/types/*`, root consumer tests |
| Wrong font/style/text width or wrapping | `features/text/*`, `measurement/doc-measure.ts`, style stack | colocated text/measurement tests, integration basics |
| Auto/star/percentage/colSpan width | `features/table/measure-table*.ts`, `layout/column-calculator.ts` | column-calculator unit + tables integration |
| Table row height/page break/header/rowSpan | `features/table/layout-table.ts`, `features/table/table-pagination.ts`, `features/table/table-processor*.ts` | tables integration + visual case when geometric |
| Table border/fill disappears or duplicates | `features/table/table-processor.borders.ts`, `features/table/table-processor.rows.ts` | tables integration and pagination visual PDF |
| Columns/snaking columns | `document-context.columns.ts`, `document-context.snaking.ts`, writers | columns/snaking integration |
| Header/footer/background/watermark | repeatables, watermark, page context | background/sections/dynamic-margin integration |
| `pageBreakBefore` wrong nodes or loop | `features/repeatables/page-break-before.feature.ts`, bounded layout passes | `page-break-before.test.ts` |
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

Confirm whether the failure belongs to PDFKit, Fontkit, the vendored SVG-to-PDFKit renderer, PDF.js or a particular viewer. Do not add unstable geometry workarounds without cross-viewer evidence.

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
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:browser
pnpm test:types
pnpm test:consumer
pnpm lint
pnpm format:check
pnpm build
```

Additional workflows:

```sh
pnpm benchmark:quick
pnpm benchmark
pnpm visual:generate
```

`pnpm test` runs the main build, contracts, unit, integration, browser, lint and formatting sequence. Browser tests require permission to open a temporary local listening port in restricted environments.
