# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- [bpampuch/pdfmake#1290 — Incorrect offset for experimental path feature](https://github.com/bpampuch/pdfmake/issues/1290): canvas `path` vectors now receive the same page and container translation as lines, rectangles, ellipses and polylines, so mixed vector types share one coordinate system.
- [bpampuch/pdfmake#1300 — Table row height overlapping problem](https://github.com/bpampuch/pdfmake/issues/1300): fixed-height table rows that fit on a fresh page now move before their row lifecycle begins instead of moving only after content has already reached the bottom margin. The new page receives complete top, side and bottom borders; rows taller than a physical page retain the multi-page fallback.
- [bpampuch/pdfmake#1388 — `colSpan` interacting badly with auto column width](https://github.com/bpampuch/pdfmake/issues/1388): width growth introduced by a spanning cell is now assigned to spanned star columns first, then auto columns, rather than being spread into fixed and compact auto columns indiscriminately.
- [bpampuch/pdfmake#1814 — Spanning of table cells](https://github.com/bpampuch/pdfmake/issues/1814): compact `colSpan` and `rowSpan` rows are normalized with inserted placeholders before preprocessing, preserving real cells that follow a span instead of overwriting them.
- [bpampuch/pdfmake#1928 — Table breaks with star-width columns](https://github.com/bpampuch/pdfmake/issues/1928), [bpampuch/pdfmake#2141 — Content not wrapping properly in table](https://github.com/bpampuch/pdfmake/issues/2141) and [bpampuch/pdfmake#2508 — Star and auto widths exceed page margins](https://github.com/bpampuch/pdfmake/issues/2508): when measured minimum word widths exceed the remaining page width, flexible auto/star columns are constrained proportionally to the available width and the existing hard-wrap layout handles long tokens. Fixed-width columns remain explicit and may still intentionally exceed the page.
- [bpampuch/pdfmake#2129 — Auto and star widths do not work well together](https://github.com/bpampuch/pdfmake/issues/2129): auto columns now receive their natural maximum width whenever the star columns' minimums still fit, then star columns divide the remainder. Long star content no longer shrinks a short auto label unnecessarily.
- [bpampuch/pdfmake#2180 — Column widths inconsistent with multiple columns](https://github.com/bpampuch/pdfmake/issues/2180): percentage-width padding and border deductions now use the column's original table index in mixed fixed/auto/star definitions instead of its position inside the filtered fixed-column list.
- Fixed repository-wide TypeScript validation for the shared-reference and JPEG-stream regression tests, matching the stricter CI `tsc --noEmit` configuration.
- [bpampuch/pdfmake#1644 — Page count on background](https://github.com/bpampuch/pdfmake/issues/1644): dynamic backgrounds now receive `(currentPage, pageCount, pageSize)` after a bounded layout pass resolves the final page count. The historical `(currentPage, pageSize)` callback remains supported for backward compatibility, including section-specific backgrounds.
- [bpampuch/pdfmake#465 — Multiple references to same object are ignored](https://github.com/bpampuch/pdfmake/issues/465) and [bpampuch/pdfmake#1775 — Cannot re-use a function to draw table rows](https://github.com/bpampuch/pdfmake/issues/1775): repeated references to the same content node or table row are now cloned as independent occurrences before preprocessing, while genuine cyclic structures remain supported. Internal measurement and position state can no longer leak from the first occurrence into later ones.
- [bpampuch/pdfmake#201 — Unordered lists do not work with background layer](https://github.com/bpampuch/pdfmake/issues/201): page transitions now preserve active horizontal offsets as well as available width, and repeatable background lines can no longer consume a pending list-marker event. Every bullet and list line remains aligned when an unordered list spans pages with a background; the context transfer also accounts for page margins, right-side offsets and orientation changes.
- [bpampuch/pdfmake#1095 — Infinite loop when report ends near bottom of page](https://github.com/bpampuch/pdfmake/issues/1095): already fixed by marking evaluated nodes during `pageBreakBefore` passes and enforcing a bounded layout-pass count. Added the original bottom-threshold scenario as a timed regression test that also verifies no content is lost or duplicated.
- [bpampuch/pdfmake#2080 — `linkToDestination` does not work with `userPassword`](https://github.com/bpampuch/pdfmake/issues/2080) and [bpampuch/pdfmake#2336 — User Password Breaks Document Links](https://github.com/bpampuch/pdfmake/issues/2336): already fixed by the current PDFKit encryption path, which encrypts annotation URI and named-destination strings with their owning object keys. Added an end-to-end regression test that opens a password-protected PDF through PDF.js and verifies both external URLs and internal named destinations.
- [bpampuch/pdfmake#2824 — Library crashes when `colSpan` receives a string](https://github.com/bpampuch/pdfmake/issues/2824): table preprocessing now rejects non-numeric, non-integer and non-positive `colSpan` and `rowSpan` values with an error identifying the property and exact cell coordinates, preventing malformed JavaScript input from reaching span layout internals.
- [bpampuch/pdfmake#2636 — Acrobat reports insufficient image-stream data](https://github.com/bpampuch/pdfmake/issues/2636): already fixed by the current PDFKit JPEG embedding path. Added an end-to-end regression test that generates a JPEG-bearing PDF and makes PDF.js parse and decode its image XObject rather than only checking that generation completes.

### Performance

- [bpampuch/pdfmake#2898 — High memory usage with multiple images](https://github.com/bpampuch/pdfmake/issues/2898): repeated inline data URLs and repeated references to the same `Uint8Array` are now assigned one internal image resource, so PDFKit decodes and embeds them once per document. Named image resources already used this cache; distinct source images necessarily retain their own decoded data during generation.

### Tests

- Added an offline visual-regression generator and inspection checklist for flexible table sizing, `colSpan` width allocation, compact column/row spans, fixed row pagination and canvas path offsets. Generated PDFs include explicit content-boundary guides and are kept outside version control.
- Recalibrated the unpacked-package size ceiling from 2.20 MB to 2.25 MB to account for the expanded published changelog while retaining the existing browser raw and gzip limits. The current package remains below the new ceiling with less than 2% headroom.

### Upstream pdfmake issues already resolved or covered

#### Layout, tables and pagination

- [bpampuch/pdfmake#2491 — Unsupported number: NaN](https://github.com/bpampuch/pdfmake/issues/2491): already covered by numeric-only public image dimensions and runtime fallback to intrinsic dimensions for invalid JavaScript values such as `width: "30%"`; percentage values remain supported for table columns, not image nodes. Added the original percentage-width case as a finite-dimension regression test.
- [bpampuch/pdfmake#72 — Table center alignment](https://github.com/bpampuch/pdfmake/issues/72): covered by typed `tableAlignment` support for left-, center- and right-aligned tables, including nested tables and repeated headers.
- [bpampuch/pdfmake#207 — Multi-page unbreakable blocks](https://github.com/bpampuch/pdfmake/issues/207): oversized unbreakable blocks retain and commit every temporary page instead of discarding content after the first page.
- [bpampuch/pdfmake#264 — Cut cell content based on cell width](https://github.com/bpampuch/pdfmake/issues/264): covered by hard word wrapping, `wordBreak`, `noWrap` and bounded text height. These controls prevent the historical uncontrolled cell overflow, although automatic horizontal ellipsis remains outside the API.
- [bpampuch/pdfmake#368 — Dynamic page margins](https://github.com/bpampuch/pdfmake/issues/368): covered by `pageMargins(currentPage, pageCount, pageSize)` with bounded convergence and page-local geometry.
- [bpampuch/pdfmake#422 — Keep image and text columns on the same page](https://github.com/bpampuch/pdfmake/issues/422): covered by the public `unbreakable` container option, which keeps the initial image/text column fragment together when it fits on one page.
- [bpampuch/pdfmake#640 — Dynamic page breaks with page-number footers](https://github.com/bpampuch/pdfmake/issues/640): covered by bounded multi-pass `pageBreakBefore` layout and isolation of headers, footers and backgrounds from body-node navigation.
- [bpampuch/pdfmake#994 — Prevent breaks between specific table rows](https://github.com/bpampuch/pdfmake/issues/994): covered by `headerRows`, `keepWithHeaderRows`, `dontBreakRows` and explicit row page breaks.
- [bpampuch/pdfmake#1088 — Phantom borders on `noBorders` tables](https://github.com/bpampuch/pdfmake/issues/1088): covered by overlapping cell fills and patterns by 0.5 pt, preventing anti-aliasing seams in macOS Preview and similar viewers.
- [bpampuch/pdfmake#1159 — Avoid breaking table rows unless necessary](https://github.com/bpampuch/pdfmake/issues/1159): `dontBreakRows` keeps normal rows together while oversized rows safely fall back to multi-page rendering.
- [bpampuch/pdfmake#1236 — Absolute positions after `pageBreakBefore`](https://github.com/bpampuch/pdfmake/issues/1236): detached-block coordinates and every moved node position are reset and recalculated on each layout pass.
- [bpampuch/pdfmake#1334 — Incorrect `startPosition.pageNumber` with `dontBreakRows`](https://github.com/bpampuch/pdfmake/issues/1334): moved unbreakable content now updates its own and its descendants' page-position metadata.
- [bpampuch/pdfmake#1425 — Margins in `defaultStyle`](https://github.com/bpampuch/pdfmake/issues/1425): margin resolution consistently uses the style stack, including named styles and `defaultStyle`.
- [bpampuch/pdfmake#1460 — Row-span positions in `pageBreakBefore`](https://github.com/bpampuch/pdfmake/issues/1460): row-spanned cells aggregate positions across their complete page span for node navigation and page-number reporting.
- [bpampuch/pdfmake#1749 — Footer nodes in `followingNodesOnPage`](https://github.com/bpampuch/pdfmake/issues/1749): backgrounds, headers and footers are excluded from the linear body-node list consumed by `pageBreakBefore`.
- [bpampuch/pdfmake#2208 — Words sometimes fail to break](https://github.com/bpampuch/pdfmake/issues/2208): overlong inlines are split using measured maximum-fit boundaries, with explicit `wordBreak: "break-all"` support.
- [bpampuch/pdfmake#2211 — Table disappears with `keepWithHeaderRows` and page margins](https://github.com/bpampuch/pdfmake/issues/2211): table transactions account for resolved page margins and commit oversized header groups instead of dropping the table.
- [bpampuch/pdfmake#2629 — Table borders disappear at some zoom levels](https://github.com/bpampuch/pdfmake/issues/2629): border-adjacent fills overlap by 0.5 pt to avoid viewer-dependent subpixel gaps.
- [bpampuch/pdfmake#2731 — Long words in star-width table columns](https://github.com/bpampuch/pdfmake/issues/2731): star columns use measured available width and the same hard-wrap path as fixed-width columns.
- [bpampuch/pdfmake#2800 — Long unspaced table strings crop boundaries](https://github.com/bpampuch/pdfmake/issues/2800): character-level fitting splits unspaced text before it can expand a table beyond the page.
- [bpampuch/pdfmake#2806 — Rows taller than the physical page are dropped](https://github.com/bpampuch/pdfmake/issues/2806): oversized rows and unbreakable table fragments are committed across all generated pages.
- [bpampuch/pdfmake#2925 — Header `verticalAlignment` fails on the second page](https://github.com/bpampuch/pdfmake/issues/2925): repeated row-spanned headers use final page metadata when calculating vertical alignment, avoiding negative heights and displaced text.

#### Reviewed table requests not integrated

- [bpampuch/pdfmake#344 — 100% table width with auto column sizing](https://github.com/bpampuch/pdfmake/issues/344) and [bpampuch/pdfmake#2333 — Auto columns using the full page width](https://github.com/bpampuch/pdfmake/issues/2333): not added because `auto` intentionally represents intrinsic content width and there is no unambiguous rule for distributing surplus space while preserving those proportions. Use one or more star columns when full-width expansion is required; a future proportional-table mode would need an explicit public option.
- [bpampuch/pdfmake#441 — Tables wider than the page](https://github.com/bpampuch/pdfmake/issues/441): horizontal table pagination is not integrated. Repeating a subset of columns below or on another page is a new layout model requiring explicit frozen-column, header and span semantics; flexible columns are now constrained, while intentionally oversized fixed tables remain the caller's responsibility.
- [bpampuch/pdfmake#1450 — Fixed table-cell height](https://github.com/bpampuch/pdfmake/issues/1450): destructive cell-level overflow clipping is not added because it can silently discard arbitrary nested content and annotations. Explicit row heights remain minimum heights, while `maxHeight` can bound text content when truncation is intentional.
- [bpampuch/pdfmake#2132 — Negative margin does not widen table cell text](https://github.com/bpampuch/pdfmake/issues/2132): negative visual margins intentionally do not increase a table column's measured allocation. Table layout padding or explicit/star widths should define cell geometry; allowing content margins to change column measurement would make neighboring cells and span calculations unstable.
- [bpampuch/pdfmake#2179 — Inconsistent total table widths](https://github.com/bpampuch/pdfmake/issues/2179): no independent defect can be reproduced from the screenshot-only report. Explicit column widths describe inner content widths and table padding plus borders are added separately; the mixed percentage-index defect described by the related #2180 is fixed above.

#### Public APIs and rendering features

- [bpampuch/pdfmake#269 — PDF forms](https://github.com/bpampuch/pdfmake/issues/269): typed block and inline AcroForm fields support text, buttons, lists, combo boxes and checkboxes in Node.js and browser output.
- [bpampuch/pdfmake#291 — Custom list numbering](https://github.com/bpampuch/pdfmake/issues/291): ordered lists support alphabetic and Roman styles, nested lists, custom starts, counters, reversal and separators.
- [bpampuch/pdfmake#375 — Vector path type](https://github.com/bpampuch/pdfmake/issues/375): canvas vectors support typed `path` geometry and PDF path rendering.
- [bpampuch/pdfmake#525 — TypeScript declarations](https://github.com/bpampuch/pdfmake/issues/525): the package is authored in TypeScript and publishes declarations for Node.js, browser and the dedicated `pdfcraft/types` export.
- [bpampuch/pdfmake#724 — Styled table borders](https://github.com/bpampuch/pdfmake/issues/724): table layouts and cell styles expose border visibility, width, color, dash and inherited border properties.
- [bpampuch/pdfmake#803 — Leading and kerning](https://github.com/bpampuch/pdfmake/issues/803): text supports `lineHeight`, `characterSpacing`, OpenType features and Fontkit shaping metrics.
- [bpampuch/pdfmake#861 — Page background color](https://github.com/bpampuch/pdfmake/issues/861): full-page colors are supported through dynamic backgrounds containing a canvas rectangle.
- [bpampuch/pdfmake#959 — Nested list numbers](https://github.com/bpampuch/pdfmake/issues/959): nested ordered lists retain independent counters and configurable numbering styles and separators.
- [bpampuch/pdfmake#983 — Vertically centered background](https://github.com/bpampuch/pdfmake/issues/983): dynamic backgrounds receive page dimensions and support normal margins, alignment and absolute positioning for deterministic centering.
- [bpampuch/pdfmake#1174 — Styles on nested text arrays](https://github.com/bpampuch/pdfmake/issues/1174): recursive inline preprocessing and the shared style-context stack apply inherited and local styles throughout nested text fragments.
- [bpampuch/pdfmake#1337 — Columns do not wrap a line of dots](https://github.com/bpampuch/pdfmake/issues/1337): character-level fitting breaks long punctuation sequences according to the resolved column width.
- [bpampuch/pdfmake#1557 — List-marker spacing](https://github.com/bpampuch/pdfmake/issues/1557): marker width is measured from the active font and list style, keeping marker and content spacing consistent.
- [bpampuch/pdfmake#1611 — Alternate content on odd and even pages](https://github.com/bpampuch/pdfmake/issues/1611): odd/even page breaks, sections and page-aware dynamic repeatables cover alternating page templates.
- [bpampuch/pdfmake#1633 — Global page border](https://github.com/bpampuch/pdfmake/issues/1633): a page-aware background canvas can draw a border on every page without affecting body flow.
- [bpampuch/pdfmake#1873 — Custom bullets and checkbox lists](https://github.com/bpampuch/pdfmake/issues/1873): unordered lists support disc, circle, square and no-marker variants with independent marker colors.
- [bpampuch/pdfmake#2240 — Image watermark](https://github.com/bpampuch/pdfmake/issues/2240): page-aware image backgrounds provide image-watermark behavior with sizing, opacity and positioning controls.
- [bpampuch/pdfmake#2440 — Per-document table layouts](https://github.com/bpampuch/pdfmake/issues/2440): `documentDefinition.tableLayouts` is merged with instance layouts without mutation and takes per-document priority.
- [bpampuch/pdfmake#2510 — Rectangle sized to page height minus margins](https://github.com/bpampuch/pdfmake/issues/2510): dynamic page margins/backgrounds receive the resolved page size, allowing canvas dimensions to be derived before rendering.

#### Architecture and tooling

- [bpampuch/pdfmake#584 — Cross-browser CI](https://github.com/bpampuch/pdfmake/issues/584): browser generation is exercised in CI with Playwright, replacing the historical Sauce Labs proposal with a locally reproducible browser suite.
- [bpampuch/pdfmake#1278 — Images in headers and footers](https://github.com/bpampuch/pdfmake/issues/1278): repeatable content accepts normal image nodes and resolves named, URL, VFS and binary image resources.
- [bpampuch/pdfmake#2472 — Code splitting](https://github.com/bpampuch/pdfmake/issues/2472): Node.js ESM, CommonJS, browser and types are separate package exports, while `sideEffects: false` enables consumer tree-shaking.
- [bpampuch/pdfmake#2546 — Generation works only once](https://github.com/bpampuch/pdfmake/issues/2546): each generation clones its document definition and owns isolated measurement and image registries, so inline resources cannot leak generated labels into subsequent runs.

## [0.5.1] - 2026-07-23

### Performance

- Reduced repeated inline-text style setup by resolving every property within one shared style-stack context. In the standard seven-iteration benchmark this lowered median generation time by 13.5% for 100 pages, 13.0% for 500 pages, 15.3% for 1,000 pages, 8.6% for a 2,000-row table and 10.7% for eight concurrent 100-page documents, with unchanged PDF output sizes.

### Fixed

- Included AcroForm values and choice labels in embedded font subsets, preventing missing glyphs in combo-box options that were not otherwise used by document text.
- Rendered PDF.js annotation layers in both playground previews so text fields, checkboxes and choice controls remain visible and interactive.

## [0.5.0] - 2026-07-22

### Upstream pdfmake PR review

#### Already covered

- [bpampuch/pdfmake#1069 — Add word breaking to columns](https://github.com/bpampuch/pdfmake/pull/1069): already covered through the explicit `wordBreak: "break-all"` style and character-level measurement. PDFCraft keeps normal column minimum widths unless callers opt into breaking inside words, avoiding the PR's unconditional shrinking of star columns.
- [bpampuch/pdfmake#1732 — Check for table body length](https://github.com/bpampuch/pdfmake/pull/1732): already fixed with stricter preprocessing errors for a missing table object, a missing or empty `table.body`, and non-array rows.
- [bpampuch/pdfmake#2289 — Throw an error when content doesn't fit to page](https://github.com/bpampuch/pdfmake/pull/2289): already fixed with safer behavior: oversized images, SVGs and canvases render once on an otherwise empty page instead of causing repeated blank pages or an unconditional exception.
- [bpampuch/pdfmake#2939 — Support `application/octet-stream` for base64 images](https://github.com/bpampuch/pdfmake/pull/2939): already supported by inline-image data URL detection and covered by typed binary-image resource tests.

#### Ported

- [bpampuch/pdfmake#2940 — Fix rowSpan header verticalAlignment on repeated tables](https://github.com/bpampuch/pdfmake/pull/2940): use the table cell's final page metadata when calculating a repeated row-spanned header's vertical alignment, preventing negative view heights and displaced header text.
- [bpampuch/pdfmake#2927 — Fix pageBreakBefore with unbreakable blocks](https://github.com/bpampuch/pdfmake/pull/2927): track every text, image, SVG, canvas, QR and attachment node moved out of an unbreakable block, update all of its page positions, and exclude backgrounds, headers and footers from `pageBreakBefore` navigation. PDFCraft already retained attachments inside fragments; the remaining stale-position and repeatable-node issues are now fixed.
- [bpampuch/pdfmake#2497 — Border and borderColor in styles](https://github.com/bpampuch/pdfmake/pull/2497): table cells now inherit `border`, `borderColor`, `fillColor` and `fillOpacity` from named styles, with matching public TypeScript properties and precedence for cell-level overrides.
- [bpampuch/pdfmake#2231 — Partially fix dontBreakRows not fitting on single page #1159](https://github.com/bpampuch/pdfmake/pull/2231): oversized unbreakable table rows are now committed across every temporary layout page instead of silently discarding all pages after the first; per-item position tracking also preserves correct page numbers when moved content spans several pages.
- [bpampuch/pdfmake#2228 — Better SVG handling](https://github.com/bpampuch/pdfmake/pull/2228): the missing-`viewBox` scaling fix was already present; named SVG resources can now be declared through `documentDefinition.svgs`, including resolved URLs and VFS files, while base64 and percent-encoded SVG data URLs are decoded explicitly without changing raster `image` semantics.
- [bpampuch/pdfmake#2866 — Fix for MacOS Preview rendering issue](https://github.com/bpampuch/pdfmake/pull/2866): table cell fills and overlay patterns now overlap their neighboring borders by 0.5 pt, preventing anti-aliasing seams in macOS Preview and similarly sensitive PDF viewers.
- [bpampuch/pdfmake#1287 — Add support for inline images](https://github.com/bpampuch/pdfmake/pull/1287): text arrays can now contain typed image fragments; inline images are resolved through the existing image registry, measured as part of line wrapping and baseline layout, and rendered with their configured dimensions, opacity and links.
- [bpampuch/pdfmake#2922 — Dynamic Page Margin](https://github.com/bpampuch/pdfmake/pull/2922): `pageMargins` can now be a callback receiving the current page, total page count and resolved page size. Layout is repeated with a bounded convergence strategy when margins depend on the final page count, page-local geometry follows each resolved margin, and columns plus repeated table headers are rebased correctly across pages with different horizontal margins. Non-convergent definitions emit one warning instead of looping indefinitely.
- [bpampuch/pdfmake#2843 — Acroforms](https://github.com/bpampuch/pdfmake/pull/2843): added typed block-level and inline AcroForm fields backed by PDFKit, with text, push-button, list, combo-box and checkbox controls; fields participate in measurement, wrapping, columns, page breaks and unbreakable fragments. Definitions are validated before layout, form initialization is shared across the document, and each field uses its resolved document font. The PR's radio-button example and `subsetFonts` workaround were intentionally not carried over because the upstream patch itself removed the unsupported radio flow and current PDFKit manages form font dictionaries directly.
- [bpampuch/pdfmake#1087 — Fix issue 72](https://github.com/bpampuch/pdfmake/pull/1087): added typed `tableAlignment` support for left-, center- and right-aligned tables. The alignment offset is applied consistently to cell content, borders, fills, nested tables and repeated headers, while full-width tables remain unchanged. PDFCraft reimplements the feature without the original patch's debug output and geometry/indexing regressions.

### Documentation and examples

- Updated the Node.js examples and both playgrounds to use PDFCraft naming and current project links.
- Added a shared `recent-features` playground sample and Node.js example covering table alignment, style-inherited cell borders and fills, named SVG resources, inline images, dynamic page margins and AcroForm fields.
- Centralized secure example resource policies and output setup, and removed unnecessary network dependencies.

### Fixed

- Fixed section-first documents failing before their initial page was created.

## [0.4.4] - 2026-07-22

### Added

- Binary image resources can now be supplied as `Uint8Array` or `ArrayBuffer` values in addition to strings.
- Playground document parsing now resolves sample resources through a shared resource map, allowing images and attachments to remain portable between the Node.js and React playgrounds.
- Regression tests cover binary resource resolution, reusable in-memory attachments, functional document-context helpers and robust cloning of dynamic content.

### Changed

- Replaced the remaining inheritance chains in `Renderer`, `DocMeasure`, `ElementWriter`, `DocumentContext` and `LayoutBuilder` with explicit composition while preserving their existing responsibilities.
- Split renderer graphics, document measurement, element writing, document context and layout-builder operations into focused collaborators.
- Simplified stateless collaborators further: document-column, snaking-column and media-writing operations are now functions instead of one-owner class instances.
- Consolidated small event, fragment and writer-type modules into their owning modules and removed redundant event forwarding.
- Made layout-builder host contracts private implementation details.
- Replaced JSON serialization used for repeating static headers and footers with the shared document clone utility. Plain objects are still deeply copied, while cycles and non-JSON values are handled safely.
- Renamed the Node-specific local resource callback contract from the overly broad `AccessPolicy` type to `LocalAccessPolicy` throughout the public and internal Node APIs.
- Split CI into named quality, contract, coverage, unit, integration, browser and package jobs. Node.js 22 and 24 remain covered where relevant.
- Removed the repository-specific Cursor rule file and ignored local `.cursor` and pdfmake working directories.
- Replaced the invoice playground sample with new fictional company, customer, invoice, service and payment data.

### Fixed

- Preserved attachment metadata when an attachment source is loaded from the virtual file system instead of returning only the raw file bytes.
- Allowed in-memory attachment objects to be reused safely across PDF generations.
- Assigned a deterministic creation date to in-memory attachments when none is supplied, improving reproducibility.
- Made data-URL detection case-insensitive.
- Restricted attachment and embedded-file URL resolution to valid string or `{ url }` resource references, preventing binary sources from being misinterpreted as URLs.
- Corrected image resource typing and conversion so binary resources reach PDFKit in a supported form.
- Updated the playground server and browser generator to resolve document resources consistently after the resource-loading refactor.
- Kept `PageElementWriter.emit()` as the observable event boundary after removing writer inheritance and redundant event buses.

### Tests and validation

- Expanded renderer coverage for vector state, clipping, paths, gradients, patterns, images, SVGs, QR codes, attachments, links, outlines and page lifecycle behavior.
- Added coverage for table-layout callbacks, server output reuse, PDF document resources and browser entry generation.
- The release passes 466 unit tests, 102 integration tests, 5 browser tests and 2 generated-package consumer tests.
- Combined unit and integration coverage is 86.08% for statements, 73.45% for branches, 91.77% for functions and 86.23% for lines.
- Node and browser type contracts, ESLint, Prettier, production builds and package-size limits are validated.

## [0.4.3] - 2026-07-22

### Added

- Added `npm run analyze:dependencies` to measure the installed size and browser-bundle contribution of PDFKit, Fontkit and `svg-to-pdfkit`.
- Reports raw, gzip and Brotli sizes and distinguishes package installation weight from marginal browser-bundle weight.
- Documents that PDFKit and its dependencies remain external to the Node.js builds, while the browser build uses PDFKit's standalone bundle.

## [0.4.2] - 2026-07-22

### Tests

- Added comprehensive unit coverage for built-in and custom table layouts.
- Added server-output tests for buffer, Base64, data-URL and file generation, including reuse of a single generated document.
- Expanded PDF-document tests for resources, attachments, local access policies and PDFKit integration.
- Added renderer-graphics tests covering vectors, clipping, images, SVGs, QR codes, links, attachments, patterns and graphics-state reuse.
- Expanded browser-entry coverage with real browser PDF generation and Blob output.

## [0.4.1] - 2026-07-22

### Added

- Added reproducible benchmark scenarios for explicit multi-page documents, large tables, image/SVG-heavy documents and concurrent generation.
- Added isolated worker-based measurements for generation time, peak RSS, peak heap and output size.
- Added full and quick benchmark commands, benchmark documentation and README usage instructions.
- Included benchmark sources in ESLint validation.

## [0.4.0] - 2026-07-22

### Origin and scope

- PDFCraft starts from the **pdfmake 0.3.11** codebase. Version 0.4.0 is the first release under the PDFCraft name and contains the complete modernization performed since that baseline.
- The pdfmake document-definition model and its major rendering capabilities remain the functional foundation, while the source, public API, build, package boundaries, tests, playgrounds and security controls have been rebuilt for PDFCraft.
- Upstream authors and contributors remain credited in the README and license notices.

### Migration notes

- The package name and public runtime names are now `pdfcraft`, `PdfCraft` and `createPdfCraft()` rather than pdfmake-specific names.
- Node.js 22 or newer is required.
- The package is ESM-first. CommonJS remains available through the `require` export.
- Browser consumers must import `pdfcraft/browser`.
- Public TypeScript contracts are exported by `pdfcraft/types`; the primary document type is `DocumentDefinition`.
- Roboto and other fonts are no longer bundled in the npm package. Applications must configure and provide their own fonts.
- Standard-font compatibility modules, generated VFS/font modules and legacy browser globals are no longer published.
- Unknown or misspelled properties on public document definitions are now rejected by TypeScript instead of being silently accepted.

### Added

#### Public API and types

- Full TypeScript source code with generated ESM, CommonJS and browser declarations.
- Explicit package exports for the Node.js ESM entry, Node.js CommonJS entry, browser entry, public types and `package.json`.
- `createPdfCraft()` and the `PdfCraft` constructor for independently configured instances, while retaining a ready-to-use default instance.
- Instance configuration for fonts, table layouts, progress callbacks, a custom virtual file system, local-file access policy and URL access policy.
- Public contracts split into common, configuration, content, document-definition, output and resource domains behind a stable types barrel.
- Public structural browser output types that do not leak DOM globals into Node.js declarations.
- Public resource-header types that do not require `HeadersInit` or another DOM declaration.
- Public definitions for document permissions, PDF subsets, patterns, attachments, files, metadata and PDF version options.
- Typed content support for sections, TOCs, outlines, page and text references, list counters, nested styles and file links.
- Typed image and SVG minimum/maximum dimensions, SVG rendering options and unified overflow constraints.
- Typed table row heights including `auto`, fill color/opacity callbacks, broken horizontal-line handling and line dash styles.
- Typed QR mask and padding options.
- Typed vector stroke opacity, legacy `lineOpacity`, dash phase, gradients, caps, joins and clipping-related geometry.
- Per-document `progressCallback` and `tableLayouts` options, with per-document values taking priority over instance defaults and layouts merged without mutation.

#### Runtime and resources

- Isolated virtual file systems for every PDFCraft instance.
- Native `Uint8Array` virtual-file storage with UTF-8, UTF-16LE, ASCII, Latin-1, binary, hexadecimal, base64 and base64url codecs.
- URL resolution for fonts, images, attachments and embedded files.
- Header-aware URL cache keys so the same URL requested with different credentials or headers remains isolated.
- Redirect-aware URL policy validation where supported by the runtime.
- Reusable output documents whose underlying byte stream is collected only once.
- Native browser `Blob`, data URL, download, open and print operations.
- Promise-based Node.js buffer, base64, data URL and file-writing output methods.

#### Development experience

- Node.js and Vite/React playgrounds backed by shared examples and a live PDF.js canvas preview.
- Off-screen browser preview generation followed by atomic page replacement.
- Download actions for PDFs generated by both playgrounds.
- Portable invoice and PDF/A samples whose attachments are loaded through the virtual file system.
- A clean-build TypeScript configuration that can build the package when `dist/` does not exist.
- Automated raw, gzip and unpacked package-size budgets.
- A controlled npm `files` list and a rebuild during `prepack`.

#### Tests and CI

- Vitest unit, integration, consumer, type-contract and Playwright/Chromium browser suites.
- Strict Node-only declaration tests without DOM libraries.
- Separate browser declaration tests with DOM libraries.
- ESM and CommonJS package-consumer tests against the generated exports.
- Real PDF generation tests in Chromium, including `blob:` preview creation.
- Regression coverage for SVG class selectors, URL policies and redirects, isolated instances, resource headers, VFS encodings, reusable outputs and PDF/A attachments.
- Regression coverage for clipping, gradients, decorations, vectors, watermarks, sections, tables, margins, paragraph gaps, page height, vertical alignment and oversized canvases.
- Colocated unit tests under `src/**/__tests__`, with integration, browser, consumer and type-contract tests retained under `tests/`.
- Enforced coverage thresholds for statements, branches, functions and lines.
- Consolidated CI jobs for code quality, Node.js 22/24, Chromium and npm-package validation.
- CI concurrency cancellation for superseded runs.

### Changed

#### Architecture

- Migrated all maintained runtime modules and tests from JavaScript to strict TypeScript.
- Reorganized the source around `core`, `configuration`, `document`, `layout`, `measurement`, `output`, `preprocessing`, `rendering`, `resources`, `text`, `types`, `utils` and `vendor` responsibilities.
- Moved measurement, SVG measurement, preprocessing and output implementations into dedicated domains.
- Split large printer, layout builder, element writer, table processor, document context, renderer and measurement modules into smaller focused units.
- Extracted shared page-item and vector geometry instead of maintaining separate height calculations.
- Extracted section-page property resolution into a pure, non-mutating helper.
- Centralized text-style resolution so inline and direct text measurements use the same font, size, features, spacing and line-height rules.
- Centralized column min/max measurement and reused it during table measurement.
- Removed the global VFS singleton from production code; each instance now owns its resource state.
- Cloned caller-owned document definitions, font descriptors and creation options before internal preprocessing or resource resolution.

#### Build and package

- Replaced the legacy Babel/Webpack/custom-script pipeline with `tsdown`.
- Added ESM-first Node.js output, generated CommonJS compatibility output and a dedicated browser bundle.
- Bundled PDFKit's standalone browser build through the normal `tsdown` configuration.
- Replaced shared browser-side `Buffer` usage with native byte utilities, eliminating the duplicate Buffer implementation from the browser path.
- Removed browser source maps from the published package.
- Marked the package as side-effect free for bundler tree-shaking.
- Added the package manager declaration and complete repository, homepage and issue metadata.
- Minified the browser bundle. During this modernization pass it decreased from approximately 2.73 MB to 1.58 MB raw and about 449 KiB gzip.
- Reduced the dry-run npm tarball from approximately 700 KiB to 575 KiB and its unpacked size from approximately 3.23 MB to 2.09 MB.
- Restricted build type-checking to production sources while resolving package self-imports directly to source during development.
- Made public declarations autonomous from PDFKit ambient namespaces and browser globals.

#### Rendering and layout

- Unified overflow handling for images and SVGs, including minimum/maximum constraints and clipping.
- Balanced clipping with explicit PDF save/clip/restore operations and validation of invalid clip rectangles.
- Reduced repeated vector graphics-state instructions for line width, dash, cap and join values.
- Made public `lineOpacity` affect vector strokes and added `strokeOpacity` as the explicit equivalent.
- Improved vector and fragment bottom-bound calculations for rectangles, ellipses, lines, polylines, paths and clipping regions.
- Reused the same geometry calculation for fragments, repeatables and infinite-height page finalization.
- Refactored watermark normalization, automatic sizing, angle calculation and font resolution into a tested unit.
- Resolved section page size, orientation, margins, header, footer, background and watermark inheritance without mutating section definitions.
- Preserved explicit zero values for watermark angle and opacity.
- Unified nested text-style inheritance and measurement behavior.
- Preserved paragraph gaps between stacked text nodes and margins across page or column breaks.
- Improved snaking-column page-break behavior, including nested non-snaking groups and repeatable table headers.
- Improved table row and row-span measurement across page boundaries.
- Improved vertical alignment calculations for table cells spanning pages.
- Allowed an oversized canvas to render once on an otherwise empty page instead of repeatedly failing to fit.

#### Tooling and repository

- Replaced Mocha and custom runners with Vitest and Playwright.
- Standardized maintained tests on strict TypeScript and kebab-case `*.test.ts` filenames.
- Removed placeholder skipped tests and implemented the remaining meaningful TODO tests.
- Expanded ESLint to maintained TypeScript, JavaScript and JSX with explicit Node.js and browser globals.
- Added Prettier validation and whitespace checks to the release pipeline.
- Replaced the legacy AngularJS playground with a small static Node.js server and a Vite/React browser application.
- Converted examples needing functions or comments to JSON5.
- Centralized repository font assets and removed duplicate example copies.

### Fixed

#### Correctness

- SVG rendering crashes caused by CSS class selectors.
- Image and SVG overflow behavior differing from each other.
- Invalid SVG dimensions and malformed SVG documents failing unclearly.
- Incorrect wavy-decoration clipping and grouping of adjacent decorations.
- Single-stop linear gradients producing an invalid stop position.
- Public vector `lineOpacity` being ignored by the renderer.
- Repeated vector state commands increasing output size unnecessarily.
- Unbalanced or invalid clipping sequences.
- Fragment and repeatable heights ignoring vector bounds or stroke widths.
- Infinite-height pages calculating vector positions twice or omitting non-text geometry.
- `maxPagesNumber: 0` being treated as unlimited output.
- Incorrect table height reservation after a row crossed a page boundary.
- Negative vertical-alignment measurements when cell content crossed pages.
- Lost top/bottom margins across page breaks.
- Missing `paragraphGap` spacing between stacked paragraphs.
- Parent styles being discarded from nested text definitions.
- Direct text measurement diverging from normal inline measurement.
- Section inheritance mutating the original document definition.
- Oversized canvases repeatedly triggering page breaks.
- Invalid embedded-file entries preventing later valid files from being processed.
- Node output reuse failing when both buffer and file output were requested.
- Caller-owned document definitions, font descriptors and creation options being mutated.
- Per-document callbacks and table layouts being silently overwritten by instance defaults.

#### Preprocessing and diagnostics

- Invalid text values reaching late layout stages instead of failing during preprocessing.
- Invalid `columns`, `stack`, unordered-list, ordered-list and table structures producing unclear errors.
- Serialized Node.js Buffer image values not being normalized to portable byte arrays.
- Misspelled and unknown public document properties being accepted by overly broad declarations.

#### Resources and security

- Shared VFS state leaking fonts or downloaded resources between independent instances and tests.
- URL caching only by URL and therefore conflating requests with different authorization headers.
- External redirects bypassing the final URL access-policy check in supported runtimes.
- Local-file paths being accepted without consulting the configured local access policy.
- Non-portable absolute attachment paths in the invoice sample.
- Unsafe directory traversal in the playground static server.

#### Browser and playgrounds

- Browser bundle failures caused by incompatible `assert`, `zlib`, stream and Buffer compatibility shims.
- Silent failures in PDFKit-specific bundle transformations.
- Incorrect browser entry, image and font paths.
- Preview requests completing out of order and replacing newer PDFs.
- Unresponsive tablet preview layout.
- Preview flickering caused by iframe reloads or partial canvas replacement.
- Object URLs not being revoked after downloads or preview replacement.

### Removed

- The obsolete `examples2` tree and its dependency on a separately published pdfmake version.
- Generated example PDFs and the legacy `build-examples.js` workflow.
- AngularJS, jQuery, Bootstrap, Ace, Express and `body-parser` playground infrastructure.
- Babel, `core-js`, `brfs`, `shx`, `npm-run-all`, `rewire` and `file-saver`.
- Webpack, obsolete loaders and browser source-map publication.
- Direct browser polyfill dependencies for `assert`, zlib, Buffer, events, process, streams and util.
- The vendored `svg-to-pdfkit` source, local wrapper and custom patch; PDFCraft now uses the pinned package dependency.
- JavaScript compilation support from the TypeScript configuration.
- Standard-font compatibility modules and exports.
- Bundled font files from the npm artifact.
- Legacy VFS/font generation scripts and `build-vfs.js`.
- The temporary custom Node build script after migration to `tsdown`.
- CommonJS interop source modules and all maintained `require()`/`module.exports` code under `src/`.
- Mocha, custom runners, Blanket metadata, `.npmignore` and obsolete package metadata.
- Empty TODO test declarations and the parallel root unit-test tree.
- The production default VFS singleton.

### Security

- Added opt-in local-file and external-URL access policies to every independently configured instance.
- Applied URL policy checks before requests and around redirects where the runtime exposes the destination.
- Isolated downloaded resources by normalized request headers.
- Validated local filesystem access before fonts, images and attachments are opened.
- Replaced the playground server with a minimal traversal-protected static server.
- Prevented caller mutation from changing resources or options during asynchronous generation.
- Limited npm publication to `dist`, README, changelog and license files.
- Added build, declaration, consumer and size checks before package publication.

### Validation

The 0.4.0 release is validated by:

- clean production builds without a pre-existing `dist/` directory;
- Node.js ESM and CommonJS generation;
- browser ESM generation;
- strict production and test type-checking;
- autonomous Node.js declarations without DOM or PDFKit ambient requirements;
- ESLint and Prettier;
- unit and integration tests;
- package-consumer tests;
- Playwright/Chromium tests with real PDF generation;
- coverage thresholds enforced in CI;
- raw, gzip and unpacked size budgets;
- npm tarball content inspection;
- `git diff --check`.

### pdfmake 0.3.11 capabilities retained

The starting baseline already included, and PDFCraft 0.4.0 retains, the following major pdfmake 0.3.11 capabilities:

- PDFKit 0.19.1 integration;
- text, styles, columns, ordered and unordered lists;
- tables, headers, row spans, column spans and configurable layouts;
- images, SVG, QR codes, vectors, patterns and gradients;
- headers, footers, backgrounds, watermarks and page-break callbacks;
- snaking columns and vertical table-cell alignment;
- table of contents, page references, text references, outlines and bookmarks;
- document sections with inheritable page properties;
- attachments, embedded files and PDF/A-related options;
- permissions, encryption, metadata, language and tagged PDF options;
- local-file and URL resource loading;
- browser `SVGElement` support and SVG validation;
- promise-based output methods.

[Unreleased]: https://github.com/kljws/pdfcraft/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/kljws/pdfcraft/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/kljws/pdfcraft/compare/v0.4.4...v0.5.0
[0.4.4]: https://github.com/kljws/pdfcraft/compare/38fde05...v0.4.4
[0.4.3]: https://github.com/kljws/pdfcraft/compare/2ad9737...38fde05
[0.4.2]: https://github.com/kljws/pdfcraft/compare/9988960...2ad9737
[0.4.1]: https://github.com/kljws/pdfcraft/compare/v0.4.0...9988960
[0.4.0]: https://github.com/kljws/pdfcraft/releases/tag/v0.4.0
